import type { ScheduleResponseDto } from '../../schedules/dtos/schedule-response.dto';
import type { TeamMemberResponseDto } from '../../teams/dtos/team-member-response.dto';
import type { UserResponseDto } from '../../users/dtos/user-response.dto';

export class MemberResponseDto {
  id: string;
  userId: string;
  churchId: string;
  fullName: string;
  cpf: string | null;
  birthDate: Date | null;
  joinedAt: Date;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: UserResponseDto;
  teamMemberships?: TeamMemberResponseDto[];
  schedules?: ScheduleResponseDto[];
}
