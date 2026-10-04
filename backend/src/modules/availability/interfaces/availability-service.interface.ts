import type { JwtUser } from '../../../common/interfaces';
import type { AvailabilityResponseDto } from '../dtos/availability-response.dto';
import type { CreateAvailabilityDto } from '../dtos/create-availability.dto';
import type { UpdateAvailabilityDto } from '../dtos/update-availability.dto';
import type { WeekdayAvailabilityResponseDto } from '../dtos/weekday-availability-response.dto';

export interface IAvailabilityService {
  /** Throws unless the caller is the member themself or leadership of their church. */
  assertCanManage(memberId: string, user: JwtUser): Promise<void>;
  /** Standing weekly rule; every weekday is returned, defaulting to available. */
  getWeekdays(memberId: string): Promise<WeekdayAvailabilityResponseDto[]>;
  setWeekdays(memberId: string, weekdays: number[]): Promise<WeekdayAvailabilityResponseDto[]>;
  create(createAvailabilityDto: CreateAvailabilityDto): Promise<AvailabilityResponseDto>;
  findOne(id: string, memberId?: string): Promise<AvailabilityResponseDto>;
  findByMember(memberId: string): Promise<AvailabilityResponseDto[]>;
  update(
    id: string,
    updateData: UpdateAvailabilityDto,
    memberId?: string,
  ): Promise<AvailabilityResponseDto>;
  remove(id: string, memberId?: string): Promise<void>;
}
