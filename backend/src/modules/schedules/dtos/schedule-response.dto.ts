import type { EventResponseDto } from '../../events/dtos/event-response.dto';
import type { MemberResponseDto } from '../../members/dtos/member-response.dto';
import type { TeamResponseDto } from '../../teams/dtos/team-response.dto';
import type { TeamRoleResponseDto } from '../../teams/dtos/team-role-response.dto';
import type { UserResponseDto } from '../../users/dtos/user-response.dto';
import type { ScheduleStatus } from '../entities/schedule.entity';

export class ScheduleResponseDto {
  id: string;
  eventId: string;
  teamId: string;
  memberId: string;
  teamRoleId: string;
  status: ScheduleStatus;
  /** Why the member asked out, while the request is pending. */
  releaseReason: string | null;
  releaseRequestedAt: Date | null;
  confirmedAt: Date | null;
  confirmedById: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  event?: EventResponseDto;
  team?: TeamResponseDto;
  teamRole?: TeamRoleResponseDto;
  member?: MemberResponseDto;
  confirmedBy?: UserResponseDto;
}
