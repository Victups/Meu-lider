import type { ScheduleResponseDto } from '../../dtos/schedule-response.dto';
import type { SwapStatus } from '../../entities/schedule-swap.entity';

export class ScheduleSwapResponseDto {
  id: string;
  scheduleId: string;
  requestedByMemberId: string;
  targetMemberId: string | null;
  acceptedByMemberId: string | null;
  status: SwapStatus;
  reason: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  schedule?: ScheduleResponseDto;
}
