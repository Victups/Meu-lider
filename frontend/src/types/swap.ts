import type { ID, ISODateString, Timestamped } from './common';
import type { Member } from './member';
import type { Schedule } from './schedule';

export type SwapStatus = 'OPEN' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

/**
 * A member asking a colleague for help with a slot. With `counterScheduleId` it
 * is a day exchange (my date for yours); without it, a hand-over.
 */
export interface ScheduleSwap extends Timestamped {
  id: ID;
  scheduleId: ID;
  requestedByMemberId: ID;
  /** Null for an open call to the whole team. */
  targetMemberId: ID | null;
  acceptedByMemberId: ID | null;
  counterScheduleId: ID | null;
  status: SwapStatus;
  reason: string | null;
  respondedAt: ISODateString | null;
  schedule?: Schedule;
  counterSchedule?: Schedule;
  requestedByMember?: Member;
  targetMember?: Member;
}

export interface MySwaps {
  /** Waiting for me to answer. */
  incoming: ScheduleSwap[];
  /** What I asked for: still open, plus the ones answered recently. */
  outgoing: ScheduleSwap[];
}

export interface SwapCandidateMember {
  memberId: ID;
  fullName: string;
}

export interface CreateSwapInput {
  scheduleId: ID;
  counterScheduleId?: ID;
  targetMemberId?: ID;
  reason?: string;
}
