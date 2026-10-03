import { toScheduleSummaryList } from '../../schedules/mappers/schedule.mapper';
import { toTeamMemberSummaryList } from '../../teams/mappers/team-member.mapper';
import { toOptionalUserResponse } from '../../users/mappers/user.mapper';
import { MemberResponseDto } from '../dtos/member-response.dto';
import { Member } from '../entities/member.entity';

export function toMemberResponse(member: Member): MemberResponseDto {
  return {
    id: member.id,
    userId: member.userId,
    churchId: member.churchId,
    fullName: member.fullName,
    cpf: member.cpf ?? null,
    birthDate: member.birthDate ?? null,
    joinedAt: member.joinedAt,
    status: member.status,
    notes: member.notes ?? null,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    user: toOptionalUserResponse(member.user),
    teamMemberships: member.teamMemberships
      ? toTeamMemberSummaryList(member.teamMemberships)
      : undefined,
    schedules: member.schedules ? toScheduleSummaryList(member.schedules) : undefined,
  };
}

export function toMemberResponseList(members: Member[]): MemberResponseDto[] {
  return members.map(toMemberResponse);
}

export function toOptionalMemberResponse(member?: Member | null): MemberResponseDto | undefined {
  return member ? toMemberResponse(member) : undefined;
}
