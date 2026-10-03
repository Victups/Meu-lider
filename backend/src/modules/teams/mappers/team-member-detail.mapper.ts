import { toOptionalMemberResponse } from '../../members/mappers/member.mapper';
import { TeamMemberResponseDto } from '../dtos/team-member-response.dto';
import { TeamMember } from '../entities/team-member.entity';
import { toTeamMemberSummary } from './team-member.mapper';

export function toTeamMemberDetail(teamMember: TeamMember): TeamMemberResponseDto {
  return {
    ...toTeamMemberSummary(teamMember),
    member: toOptionalMemberResponse(teamMember.member),
  };
}

export function toTeamMemberDetailList(teamMembers: TeamMember[]): TeamMemberResponseDto[] {
  return teamMembers.map(toTeamMemberDetail);
}
