import { toOptionalEventResponse } from '../../events/mappers/event.mapper';
import { toOptionalMemberResponse } from '../../members/mappers/member.mapper';
import { toOptionalTeamRoleResponse } from '../../teams/mappers/team-role.mapper';
import { toOptionalTeamResponse } from '../../teams/mappers/team.mapper';
import { toOptionalUserResponse } from '../../users/mappers/user.mapper';
import { ScheduleResponseDto } from '../dtos/schedule-response.dto';
import { Schedule } from '../entities/schedule.entity';
import { toScheduleSummary } from './schedule.mapper';

export function toScheduleResponse(schedule: Schedule): ScheduleResponseDto {
  return {
    ...toScheduleSummary(schedule),
    event: toOptionalEventResponse(schedule.event),
    team: toOptionalTeamResponse(schedule.team),
    teamRole: toOptionalTeamRoleResponse(schedule.teamRole),
    member: toOptionalMemberResponse(schedule.member),
    confirmedBy: toOptionalUserResponse(schedule.confirmedBy),
  };
}

export function toScheduleResponseList(schedules: Schedule[]): ScheduleResponseDto[] {
  return schedules.map(toScheduleResponse);
}
