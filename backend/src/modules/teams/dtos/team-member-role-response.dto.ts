import type { TeamRoleResponseDto } from './team-role-response.dto';

export class TeamMemberRoleResponseDto {
  id: string;
  teamMemberId: string;
  teamRoleId: string;
  isPrimary: boolean;
  createdAt: Date;
  teamRole?: TeamRoleResponseDto;
}
