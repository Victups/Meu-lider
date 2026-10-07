import { ScheduleResponseDto } from '../dtos/schedule-response.dto';
import { Schedule } from '../entities/schedule.entity';

/**
 * Flat projection, without relations. Kept free of other mappers so modules that
 * embed schedules (events, members) can reuse it without an import cycle.
 */
export function toScheduleSummary(schedule: Schedule): ScheduleResponseDto {
  return {
    id: schedule.id,
    eventId: schedule.eventId,
    teamId: schedule.teamId,
    memberId: schedule.memberId,
    teamRoleId: schedule.teamRoleId,
    status: schedule.status,
    releaseReason: schedule.releaseReason ?? null,
    releaseRequestedAt: schedule.releaseRequestedAt ?? null,
    confirmedAt: schedule.confirmedAt,
    confirmedById: schedule.confirmedById,
    notes: schedule.notes,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
}

export function toScheduleSummaryList(schedules: Schedule[]): ScheduleResponseDto[] {
  return schedules.map(toScheduleSummary);
}

export function toOptionalScheduleSummary(
  schedule?: Schedule | null,
): ScheduleResponseDto | undefined {
  return schedule ? toScheduleSummary(schedule) : undefined;
}
