import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import {
  ChurchAccessDeniedException,
  InsufficientPermissionException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { Member } from '../members/entities/member.entity';
import { UserRole } from '../users/entities/user.entity';
import { AvailabilityResponseDto } from './dtos/availability-response.dto';
import { CreateAvailabilityDto } from './dtos/create-availability.dto';
import { UpdateAvailabilityDto } from './dtos/update-availability.dto';
import { Availability } from './entities/availability.entity';
import { WeekdayAvailability } from './entities/weekday-availability.entity';
import type { IAvailabilityService } from './interfaces/availability-service.interface';
import {
  toAvailabilityResponse,
  toAvailabilityResponseList,
} from './mappers/availability.mapper';
import { WeekdayAvailabilityResponseDto } from './dtos/weekday-availability-response.dto';

/** 0 = Sunday … 6 = Saturday, matching JavaScript's getDay(). */
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

@Injectable()
export class AvailabilityService implements IAvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(WeekdayAvailability)
    private readonly weekdayRepository: Repository<WeekdayAvailability>,
  ) {}

  async getWeekdays(memberId: string): Promise<WeekdayAvailabilityResponseDto[]> {
    const stored = await this.weekdayRepository.find({
      where: { memberId },
      order: { weekday: 'ASC' },
    });

    // A member who never opened the screen has no rows and serves any day.
    const byWeekday = new Map(stored.map((entry) => [entry.weekday, entry.isAvailable]));
    return WEEKDAYS.map((weekday) => ({
      weekday,
      isAvailable: byWeekday.get(weekday) ?? true,
    }));
  }

  /** Replaces the whole week in one shot: days listed are in, the rest are out. */
  async setWeekdays(
    memberId: string,
    weekdays: number[],
  ): Promise<WeekdayAvailabilityResponseDto[]> {
    const allowed = new Set(weekdays);

    await this.weekdayRepository.manager.transaction(async (manager) => {
      await manager.delete(WeekdayAvailability, { memberId });
      await manager.save(
        WEEKDAYS.map((weekday) =>
          manager.create(WeekdayAvailability, {
            memberId,
            weekday,
            isAvailable: allowed.has(weekday),
          }),
        ),
      );
    });

    return this.getWeekdays(memberId);
  }

  /**
   * Availability drives the auto-scheduler, so writing someone else's agenda
   * would let a member steer who gets picked. Only the member themself or the
   * leadership of their own church may touch it.
   */
  async assertCanManage(memberId: string, user: JwtUser): Promise<void> {
    const member = await this.membersRepository.findOne({ where: { id: memberId } });

    if (!member) {
      throw new ResourceNotFoundException(ResourceType.MEMBER, memberId);
    }

    if (user.role === UserRole.SUPER_ADMIN) return;

    if (member.churchId !== user.churchId) {
      throw new ChurchAccessDeniedException(member.churchId);
    }

    const isSelf = member.userId === user.id;
    const isLeadership = user.role === UserRole.CHURCH_ADMIN || user.role === UserRole.LEADER;

    if (!isSelf && !isLeadership) {
      throw new InsufficientPermissionException(
        'Você só pode alterar a sua própria disponibilidade',
      );
    }
  }

  async create(createAvailabilityDto: CreateAvailabilityDto): Promise<AvailabilityResponseDto> {
    const availability = this.availabilityRepository.create(createAvailabilityDto);
    return toAvailabilityResponse(await this.availabilityRepository.save(availability));
  }

  async findOne(id: string, memberId?: string): Promise<AvailabilityResponseDto> {
    return toAvailabilityResponse(await this.findAvailabilityEntity(id, memberId));
  }

  async findByMember(memberId: string): Promise<AvailabilityResponseDto[]> {
    const availabilities = await this.availabilityRepository.find({
      where: { memberId },
      order: { dateFrom: 'ASC' },
    });

    return toAvailabilityResponseList(availabilities);
  }

  async update(
    id: string,
    updateData: UpdateAvailabilityDto,
    memberId?: string,
  ): Promise<AvailabilityResponseDto> {
    const availability = await this.findAvailabilityEntity(id, memberId);

    Object.assign(availability, updateData);
    return toAvailabilityResponse(await this.availabilityRepository.save(availability));
  }

  async remove(id: string, memberId?: string): Promise<void> {
    const availability = await this.findAvailabilityEntity(id, memberId);
    await this.availabilityRepository.delete(availability.id);
  }

  /** `memberId` scopes the lookup so an authorised route cannot reach another member's row. */
  private async findAvailabilityEntity(id: string, memberId?: string): Promise<Availability> {
    const availability = await this.availabilityRepository.findOne({
      where: memberId ? { id, memberId } : { id },
      relations: { member: true },
    });

    if (!availability) {
      throw new ResourceNotFoundException(ResourceType.AVAILABILITY, id);
    }

    return availability;
  }
}
