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
import { ChurchGuard, JwtAuthGuard } from '../../common/guards';
import type { AuthenticatedRequest, MessageResponse } from '../../common/interfaces';
import { AddTeamMemberDto } from './dtos/add-team-member.dto';
import { AssignTeamRoleDto } from './dtos/assign-team-role.dto';
import { CreateTeamDto } from './dtos/create-team.dto';
import { TeamMemberResponseDto } from './dtos/team-member-response.dto';
import { TeamMemberRoleResponseDto } from './dtos/team-member-role-response.dto';
import { TeamResponseDto } from './dtos/team-response.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { TeamRolesService } from './team-roles.service';
import { TeamsService } from './teams.service';

@Controller('churches/:churchId/teams')
@UseGuards(JwtAuthGuard, ChurchGuard)
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly teamRolesService: TeamRolesService,
  ) {}

  @Get()
  findByChurch(@Param('churchId') churchId: string): Promise<TeamResponseDto[]> {
    return this.teamsService.findByChurch(churchId);
  }

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

  @Put(':teamId')
  update(
    @Param('teamId') id: string,
    @Body() updateData: UpdateTeamDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamResponseDto> {
    return this.teamsService.update(id, updateData, req.user);
  }

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
  addMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() body: AddTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    return this.teamsService.addMember(teamId, memberId, body.role);
  }

  @Delete(':teamId/members/:memberId')
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ): Promise<MessageResponse> {
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
  assignRoleToMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Param('roleId') roleId: string,
    @Body() body: AssignTeamRoleDto,
  ): Promise<TeamMemberRoleResponseDto> {
    return this.teamRolesService.assignRoleToMember(teamId, memberId, roleId, body);
  }

  @Delete(':teamId/members/:memberId/roles/:roleId')
  async removeRoleFromMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Param('roleId') roleId: string,
  ): Promise<MessageResponse> {
    await this.teamRolesService.removeRoleFromMember(teamId, memberId, roleId);
    return { message: 'Função removida do membro' };
  }
}
