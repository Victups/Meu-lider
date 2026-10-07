import type { MemberResponseDto } from '../../../members/dtos/member-response.dto';
import type { ScheduleResponseDto } from '../../dtos/schedule-response.dto';
import type { SwapStatus } from '../../entities/schedule-swap.entity';

export class ScheduleSwapResponseDto {
  id: string;
  scheduleId: string;
  requestedByMemberId: string;
  targetMemberId: string | null;
  acceptedByMemberId: string | null;
  counterScheduleId: string | null;
  status: SwapStatus;
  reason: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  schedule?: ScheduleResponseDto;
  counterSchedule?: ScheduleResponseDto;
  requestedByMember?: MemberResponseDto;
  /** Resolved separately: the entity keeps only the id of a directed request. */
  targetMember?: MemberResponseDto;
}

/** A member who could take a slot over, as offered to the person asking. */
export class SwapCandidateMemberDto {
  memberId: string;
  fullName: string;
}

/** What the swaps screen needs in one call. */
export class MySwapsDto {
  /** Waiting for me to answer: directed at me, or open calls I could take. */
  incoming: ScheduleSwapResponseDto[];
  /** Requests I made: still open, plus the ones answered recently. */
  outgoing: ScheduleSwapResponseDto[];
}
