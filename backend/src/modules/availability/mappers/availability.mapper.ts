import { toOptionalMemberResponse } from '../../members/mappers/member.mapper';
import { AvailabilityResponseDto } from '../dtos/availability-response.dto';
import { Availability } from '../entities/availability.entity';

export function toAvailabilityResponse(availability: Availability): AvailabilityResponseDto {
  return {
    id: availability.id,
    memberId: availability.memberId,
    dateFrom: availability.dateFrom,
    dateTo: availability.dateTo,
    isAvailable: availability.isAvailable,
    reason: availability.reason ?? null,
    createdAt: availability.createdAt,
    updatedAt: availability.updatedAt,
    member: toOptionalMemberResponse(availability.member),
  };
}

export function toAvailabilityResponseList(
  availabilities: Availability[],
): AvailabilityResponseDto[] {
  return availabilities.map(toAvailabilityResponse);
}
