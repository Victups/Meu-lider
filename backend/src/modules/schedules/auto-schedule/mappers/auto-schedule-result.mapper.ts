import { SCHEDULE_GAP_MESSAGES, type ScheduleGapReason } from '../../../../common/constants';
import type { TeamRole } from '../../../teams/entities/team-role.entity';
import type { Schedule } from '../../entities/schedule.entity';
import {
  AutoScheduleAssignmentDto,
  ScheduleGapDto,
} from '../dtos/auto-schedule-result.dto';

export function toAutoScheduleAssignment(
  schedule: Schedule,
  teamRole: TeamRole,
  fairnessScore: number,
): AutoScheduleAssignmentDto {
  return {
    // Absent on a dry run, where the entity was built but never saved.
    scheduleId: schedule.id ?? null,
    eventId: schedule.eventId,
    teamId: schedule.teamId,
    teamName: teamRole.team?.name ?? '',
    teamRoleId: schedule.teamRoleId,
    teamRoleName: teamRole.name,
    memberId: schedule.memberId,
    fairnessScore: Math.round(fairnessScore * 100) / 100,
  };
}

export function toScheduleGap(
  teamRole: TeamRole,
  requiredSlots: number,
  filledSlots: number,
  reason: ScheduleGapReason,
): ScheduleGapDto {
  return {
    teamId: teamRole.teamId,
    teamName: teamRole.team?.name ?? '',
    teamRoleId: teamRole.id,
    teamRoleName: teamRole.name,
    requiredSlots,
    filledSlots,
    missingSlots: requiredSlots - filledSlots,
    reason,
    message: SCHEDULE_GAP_MESSAGES[reason],
  };
}
