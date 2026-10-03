import { TeamRoleResponseDto } from '../dtos/team-role-response.dto';
import { TeamRole } from '../entities/team-role.entity';

/**
 * Flat projection. Kept free of other mappers so modules that embed a position
 * (schedules) can reuse it without an import cycle.
 */
export function toTeamRoleResponse(teamRole: TeamRole): TeamRoleResponseDto {
  return {
    id: teamRole.id,
    teamId: teamRole.teamId,
    name: teamRole.name,
    slug: teamRole.slug,
    color: teamRole.color ?? null,
    defaultSlots: teamRole.defaultSlots,
    active: teamRole.active,
    createdAt: teamRole.createdAt,
    updatedAt: teamRole.updatedAt,
  };
}

export function toTeamRoleResponseList(teamRoles: TeamRole[]): TeamRoleResponseDto[] {
  return teamRoles.map(toTeamRoleResponse);
}

export function toOptionalTeamRoleResponse(
  teamRole?: TeamRole | null,
): TeamRoleResponseDto | undefined {
  return teamRole ? toTeamRoleResponse(teamRole) : undefined;
}
