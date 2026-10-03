import type { AvailabilityResponseDto } from '../dtos/availability-response.dto';
import type { CreateAvailabilityDto } from '../dtos/create-availability.dto';
import type { UpdateAvailabilityDto } from '../dtos/update-availability.dto';

export interface IAvailabilityService {
  create(createAvailabilityDto: CreateAvailabilityDto): Promise<AvailabilityResponseDto>;
  findOne(id: string): Promise<AvailabilityResponseDto>;
  findByMember(memberId: string): Promise<AvailabilityResponseDto[]>;
  update(id: string, updateData: UpdateAvailabilityDto): Promise<AvailabilityResponseDto>;
  remove(id: string): Promise<void>;
}
