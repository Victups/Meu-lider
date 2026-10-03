import { TeamMemberResponseDto } from '../dtos/team-member-response.dto';
import { TeamMember } from '../entities/team-member.entity';

/** Flat projection, without the nested member. See team-member-detail.mapper for the full one. */
export function toTeamMemberSummary(teamMember: TeamMember): TeamMemberResponseDto {
  return {
    id: teamMember.id,
    teamId: teamMember.teamId,
    memberId: teamMember.memberId,
    role: teamMember.role ?? null,
    startedAt: teamMember.startedAt,
    endedAt: teamMember.endedAt ?? null,
    isLeader: teamMember.isLeader,
    createdAt: teamMember.createdAt,
    updatedAt: teamMember.updatedAt,
  };
}

export function toTeamMemberSummaryList(teamMembers: TeamMember[]): TeamMemberResponseDto[] {
  return teamMembers.map(toTeamMemberSummary);
}
