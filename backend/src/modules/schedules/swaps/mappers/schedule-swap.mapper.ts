import { toOptionalMemberResponse } from '../../../members/mappers/member.mapper';
import { ScheduleSwap } from '../../entities/schedule-swap.entity';
import { toScheduleResponse } from '../../mappers/schedule-detail.mapper';
import { ScheduleSwapResponseDto } from '../dtos/schedule-swap-response.dto';

export function toScheduleSwapResponse(swap: ScheduleSwap): ScheduleSwapResponseDto {
  return {
    id: swap.id,
    scheduleId: swap.scheduleId,
    requestedByMemberId: swap.requestedByMemberId,
    targetMemberId: swap.targetMemberId,
    acceptedByMemberId: swap.acceptedByMemberId,
    counterScheduleId: swap.counterScheduleId ?? null,
    status: swap.status,
    reason: swap.reason,
    respondedAt: swap.respondedAt,
    createdAt: swap.createdAt,
    updatedAt: swap.updatedAt,
    schedule: swap.schedule ? toScheduleResponse(swap.schedule) : undefined,
    counterSchedule: swap.counterSchedule ? toScheduleResponse(swap.counterSchedule) : undefined,
    requestedByMember: toOptionalMemberResponse(swap.requestedByMember),
  };
}

export function toScheduleSwapResponseList(swaps: ScheduleSwap[]): ScheduleSwapResponseDto[] {
  return swaps.map(toScheduleSwapResponse);
}
