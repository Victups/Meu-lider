import { TeamMemberRoleResponseDto } from '../dtos/team-member-role-response.dto';
import { TeamMemberRole } from '../entities/team-member-role.entity';
import { toOptionalTeamRoleResponse } from './team-role.mapper';

export function toTeamMemberRoleResponse(
  assignment: TeamMemberRole,
): TeamMemberRoleResponseDto {
  return {
    id: assignment.id,
    teamMemberId: assignment.teamMemberId,
    teamRoleId: assignment.teamRoleId,
    isPrimary: assignment.isPrimary,
    createdAt: assignment.createdAt,
    teamRole: toOptionalTeamRoleResponse(assignment.teamRole),
  };
}

export function toTeamMemberRoleResponseList(
  assignments: TeamMemberRole[],
): TeamMemberRoleResponseDto[] {
  return assignments.map(toTeamMemberRoleResponse);
}
