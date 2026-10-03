import { ScheduleSwap } from '../../entities/schedule-swap.entity';
import { toOptionalScheduleSummary } from '../../mappers/schedule.mapper';
import { ScheduleSwapResponseDto } from '../dtos/schedule-swap-response.dto';

export function toScheduleSwapResponse(swap: ScheduleSwap): ScheduleSwapResponseDto {
  return {
    id: swap.id,
    scheduleId: swap.scheduleId,
    requestedByMemberId: swap.requestedByMemberId,
    targetMemberId: swap.targetMemberId,
    acceptedByMemberId: swap.acceptedByMemberId,
    status: swap.status,
    reason: swap.reason,
    respondedAt: swap.respondedAt,
    createdAt: swap.createdAt,
    updatedAt: swap.updatedAt,
    schedule: toOptionalScheduleSummary(swap.schedule),
  };
}

export function toScheduleSwapResponseList(swaps: ScheduleSwap[]): ScheduleSwapResponseDto[] {
  return swaps.map(toScheduleSwapResponse);
}
