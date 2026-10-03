import type { ScheduleGapReason } from '../../../../common/constants';

export class AutoScheduleAssignmentDto {
  /** Null on a dry run — nothing was persisted. */
  scheduleId: string | null;
  eventId: string;
  teamId: string;
  teamName: string;
  teamRoleId: string;
  teamRoleName: string;
  memberId: string;
  /** Fairness score that won the slot, kept so the leader can audit the choice. */
  fairnessScore: number;
}

export class ScheduleGapDto {
  teamId: string;
  teamName: string;
  teamRoleId: string;
  teamRoleName: string;
  requiredSlots: number;
  filledSlots: number;
  missingSlots: number;
  reason: ScheduleGapReason;
  message: string;
}

export class AutoScheduleResultDto {
  eventId: string;
  eventName: string;
  eventDate: Date;
  dryRun: boolean;
  /** Assignments created by this run. */
  createdCount: number;
  /** Slots already taken before this run — the idempotency evidence. */
  alreadyFilledCount: number;
  /** Slots nobody could fill. */
  missingCount: number;
  fullyStaffed: boolean;
  assignments: AutoScheduleAssignmentDto[];
  gaps: ScheduleGapDto[];
}
