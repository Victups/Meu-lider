import type { JwtUser } from '../../../common/interfaces';
import type { AssignTeamRoleDto } from '../dtos/assign-team-role.dto';
import type { CreateTeamRoleDto } from '../dtos/create-team-role.dto';
import type { TeamMemberRoleResponseDto } from '../dtos/team-member-role-response.dto';
import type { TeamRoleResponseDto } from '../dtos/team-role-response.dto';
import type { UpdateTeamRoleDto } from '../dtos/update-team-role.dto';

export interface ITeamRolesService {
  create(createTeamRoleDto: CreateTeamRoleDto, user: JwtUser): Promise<TeamRoleResponseDto>;
  findByTeam(teamId: string): Promise<TeamRoleResponseDto[]>;
  findOne(teamId: string, roleId: string): Promise<TeamRoleResponseDto>;
  update(
    teamId: string,
    roleId: string,
    updateData: UpdateTeamRoleDto,
    user: JwtUser,
  ): Promise<TeamRoleResponseDto>;
  remove(teamId: string, roleId: string, user: JwtUser): Promise<TeamRoleResponseDto>;
  getMemberRoles(teamId: string, memberId: string): Promise<TeamMemberRoleResponseDto[]>;
  assignRoleToMember(
    teamId: string,
    memberId: string,
    roleId: string,
    assignTeamRoleDto: AssignTeamRoleDto,
  ): Promise<TeamMemberRoleResponseDto>;
  removeRoleFromMember(teamId: string, memberId: string, roleId: string): Promise<void>;
}
