import type { TeamMember } from '../../../teams/entities/team-member.entity';

/** How often and how recently a member has served, relative to the event date. */
export interface MemberServingHistory {
  /** Assignments inside FAIRNESS_LOOKBACK_DAYS before the event. */
  recentAssignments: number;
  /** Days since the last assignment; capped at FAIRNESS_MAX_REST_DAYS. */
  daysSinceLastAssignment: number;
  /** Served inside FAIRNESS_CONSECUTIVE_WINDOW_DAYS before the event. */
  servedInConsecutiveWindow: boolean;
}

/** A member who cleared every hard filter, with the score that ranks them. */
export interface FairnessCandidate {
  teamMember: TeamMember;
  memberId: string;
  isPrimaryForRole: boolean;
  history: MemberServingHistory;
  score: number;
}
