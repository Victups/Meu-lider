import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CHURCH_MANAGER_ROLES, MANAGER_ROLES } from '../../common/constants';
import { Roles } from '../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { AuthenticatedRequest, MessageResponse } from '../../common/interfaces';
import { AddTeamMemberDto } from './dtos/add-team-member.dto';
import { AssignTeamRoleDto } from './dtos/assign-team-role.dto';
import { CreateTeamDto } from './dtos/create-team.dto';
import { SetTeamLeaderDto } from './dtos/set-team-leader.dto';
import { TeamMemberResponseDto } from './dtos/team-member-response.dto';
import { TeamMemberRoleResponseDto } from './dtos/team-member-role-response.dto';
import { TeamResponseDto } from './dtos/team-response.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { TeamAccessService } from './team-access.service';
import { TeamRolesService } from './team-roles.service';

import { TeamsService } from './teams.service';

@Controller('churches/:churchId/teams')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly teamRolesService: TeamRolesService,
    private readonly teamAccessService: TeamAccessService,
  ) {}

  @Get()
  findByChurch(@Param('churchId') churchId: string): Promise<TeamResponseDto[]> {
    return this.teamsService.findByChurch(churchId);
  }

  /** Teams the logged-in user leads (every team, for church admins). */
  @Get('led')
  findLed(
    @Param('churchId') churchId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamResponseDto[]> {
    return this.teamsService.findLedBy(churchId, req.user);
  }

  @Roles(...MANAGER_ROLES)
  @Post()
  create(
    @Param('churchId') churchId: string,
    @Body() createTeamDto: CreateTeamDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamResponseDto> {
    createTeamDto.churchId = churchId;
    return this.teamsService.create(createTeamDto, req.user);
  }

  @Get(':teamId')
  findOne(@Param('teamId') id: string): Promise<TeamResponseDto> {
    return this.teamsService.findOne(id);
  }

  @Roles(...MANAGER_ROLES)

  @Put(':teamId')
  update(
    @Param('teamId') id: string,
    @Body() updateData: UpdateTeamDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamResponseDto> {
    return this.teamsService.update(id, updateData, req.user);
  }

  @Roles(...MANAGER_ROLES)

  @Delete(':teamId')
  remove(
    @Param('teamId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamResponseDto> {
    return this.teamsService.remove(id, req.user);
  }

  @Get(':teamId/members')
  getMembers(@Param('teamId') teamId: string): Promise<TeamMemberResponseDto[]> {
    return this.teamsService.getTeamMembers(teamId);
  }

  @Post(':teamId/members/:memberId')
  async addMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() body: AddTeamMemberDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamMemberResponseDto> {
    await this.teamAccessService.assertCanManageTeam(teamId, req.user);
    return this.teamsService.addMember(teamId, memberId, body.role);
  }

  /** Only church admins appoint leaders; a member may lead several teams. */
  @Roles(...CHURCH_MANAGER_ROLES)
  @Put(':teamId/members/:memberId/leader')
  setLeader(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() body: SetTeamLeaderDto,
  ): Promise<TeamMemberResponseDto> {
    return this.teamsService.setLeader(teamId, memberId, body.isLeader);
  }

  @Delete(':teamId/members/:memberId')
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    await this.teamAccessService.assertCanManageTeam(teamId, req.user);
    await this.teamsService.removeMember(teamId, memberId);
    return { message: 'Membro removido da equipe' };
  }

  @Get(':teamId/members/:memberId/roles')
  getMemberRoles(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ): Promise<TeamMemberRoleResponseDto[]> {
    return this.teamRolesService.getMemberRoles(teamId, memberId);
  }

  @Post(':teamId/members/:memberId/roles/:roleId')
  async assignRoleToMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Param('roleId') roleId: string,
    @Body() body: AssignTeamRoleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamMemberRoleResponseDto> {
    await this.teamAccessService.assertCanManageTeam(teamId, req.user);
    return this.teamRolesService.assignRoleToMember(teamId, memberId, roleId, body);
  }

  @Delete(':teamId/members/:memberId/roles/:roleId')
  async removeRoleFromMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Param('roleId') roleId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    await this.teamAccessService.assertCanManageTeam(teamId, req.user);
    await this.teamRolesService.removeRoleFromMember(teamId, memberId, roleId);
    return { message: 'Função removida do membro' };
  }
}
