import type { MemberResponseDto } from '../../members/dtos/member-response.dto';

export class TeamMemberResponseDto {
  id: string;
  teamId: string;
  memberId: string;
  role: string | null;
  startedAt: Date;
  endedAt: Date | null;
  isLeader: boolean;
  createdAt: Date;
  updatedAt: Date;
  member?: MemberResponseDto;
}
