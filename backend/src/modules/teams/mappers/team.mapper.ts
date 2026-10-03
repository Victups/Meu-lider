import { TeamResponseDto } from '../dtos/team-response.dto';
import { Team } from '../entities/team.entity';
import { toTeamMemberDetailList } from './team-member-detail.mapper';

export function toTeamResponse(team: Team): TeamResponseDto {
  return {
    id: team.id,
    churchId: team.churchId,
    name: team.name,
    slug: team.slug,
    description: team.description ?? null,
    color: team.color ?? null,
    active: team.active,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    members: team.members ? toTeamMemberDetailList(team.members) : undefined,
  };
}

export function toTeamResponseList(teams: Team[]): TeamResponseDto[] {
  return teams.map(toTeamResponse);
}

export function toOptionalTeamResponse(team?: Team | null): TeamResponseDto | undefined {
  return team ? toTeamResponse(team) : undefined;
}
