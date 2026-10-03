import { toMemberResponseList } from '../../members/mappers/member.mapper';
import { toTeamResponseList } from '../../teams/mappers/team.mapper';
import { toUserResponseList } from '../../users/mappers/user.mapper';
import { ChurchResponseDto } from '../dtos/church-response.dto';
import { Church } from '../entities/church.entity';

export function toChurchResponse(church: Church): ChurchResponseDto {
  return {
    id: church.id,
    name: church.name,
    slug: church.slug,
    description: church.description ?? null,
    address: church.address ?? null,
    phone: church.phone ?? null,
    email: church.email ?? null,
    logoUrl: church.logoUrl ?? null,
    website: church.website ?? null,
    active: church.active,
    createdAt: church.createdAt,
    updatedAt: church.updatedAt,
    users: church.users ? toUserResponseList(church.users) : undefined,
    teams: church.teams ? toTeamResponseList(church.teams) : undefined,
    members: church.members ? toMemberResponseList(church.members) : undefined,
  };
}

export function toChurchResponseList(churches: Church[]): ChurchResponseDto[] {
  return churches.map(toChurchResponse);
}
