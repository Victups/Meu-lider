import type { MemberResponseDto } from '../../members/dtos/member-response.dto';

export class AvailabilityResponseDto {
  id: string;
  memberId: string;
  dateFrom: Date;
  dateTo: Date;
  isAvailable: boolean;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
  member?: MemberResponseDto;
}
