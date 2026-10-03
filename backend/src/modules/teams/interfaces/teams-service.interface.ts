import type { JwtUser } from '../../../common/interfaces';
import type { CreateTeamDto } from '../dtos/create-team.dto';
import type { TeamMemberResponseDto } from '../dtos/team-member-response.dto';
import type { TeamResponseDto } from '../dtos/team-response.dto';
import type { UpdateTeamDto } from '../dtos/update-team.dto';

export interface ITeamsService {
  create(createTeamDto: CreateTeamDto, user: JwtUser): Promise<TeamResponseDto>;
  findOne(id: string): Promise<TeamResponseDto>;
  findByChurch(churchId: string): Promise<TeamResponseDto[]>;
  update(id: string, updateData: UpdateTeamDto, user: JwtUser): Promise<TeamResponseDto>;
  remove(id: string, user: JwtUser): Promise<TeamResponseDto>;
  getTeamMembers(teamId: string): Promise<TeamMemberResponseDto[]>;
  addMember(teamId: string, memberId: string, role?: string): Promise<TeamMemberResponseDto>;
  removeMember(teamId: string, memberId: string): Promise<void>;
}
