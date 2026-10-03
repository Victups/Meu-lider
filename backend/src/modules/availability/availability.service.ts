import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import { ResourceNotFoundException } from '../../common/exceptions';
import { AvailabilityResponseDto } from './dtos/availability-response.dto';
import { CreateAvailabilityDto } from './dtos/create-availability.dto';
import { UpdateAvailabilityDto } from './dtos/update-availability.dto';
import { Availability } from './entities/availability.entity';
import type { IAvailabilityService } from './interfaces/availability-service.interface';
import {
  toAvailabilityResponse,
  toAvailabilityResponseList,
} from './mappers/availability.mapper';

@Injectable()
export class AvailabilityService implements IAvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
  ) {}

  async create(createAvailabilityDto: CreateAvailabilityDto): Promise<AvailabilityResponseDto> {
    const availability = this.availabilityRepository.create(createAvailabilityDto);
    return toAvailabilityResponse(await this.availabilityRepository.save(availability));
  }

  async findOne(id: string): Promise<AvailabilityResponseDto> {
    return toAvailabilityResponse(await this.findAvailabilityEntity(id));
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
  ): Promise<AvailabilityResponseDto> {
    const availability = await this.findAvailabilityEntity(id);

    Object.assign(availability, updateData);
    return toAvailabilityResponse(await this.availabilityRepository.save(availability));
  }

  async remove(id: string): Promise<void> {
    await this.availabilityRepository.delete(id);
  }

  private async findAvailabilityEntity(id: string): Promise<Availability> {
    const availability = await this.availabilityRepository.findOne({
      where: { id },
      relations: { member: true },
    });

    if (!availability) {
      throw new ResourceNotFoundException(ResourceType.AVAILABILITY, id);
    }

    return availability;
  }
}
