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
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { AuthenticatedRequest } from '../../common/interfaces';
import { CreateTeamRoleDto } from './dtos/create-team-role.dto';
import { TeamRoleResponseDto } from './dtos/team-role-response.dto';
import { UpdateTeamRoleDto } from './dtos/update-team-role.dto';
import { TeamAccessService } from './team-access.service';
import { TeamRolesService } from './team-roles.service';

@Controller('churches/:churchId/teams/:teamId/roles')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
export class TeamRolesController {
  constructor(
    private readonly teamRolesService: TeamRolesService,
    private readonly teamAccessService: TeamAccessService,
  ) {}

  @Get()
  findByTeam(@Param('teamId') teamId: string): Promise<TeamRoleResponseDto[]> {
    return this.teamRolesService.findByTeam(teamId);
  }

  @Post()
  async create(
    @Param('teamId') teamId: string,
    @Body() createTeamRoleDto: CreateTeamRoleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamRoleResponseDto> {
    await this.teamAccessService.assertCanManageTeam(teamId, req.user);
    createTeamRoleDto.teamId = teamId;
    return this.teamRolesService.create(createTeamRoleDto, req.user);
  }

  @Get(':roleId')
  findOne(
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
  ): Promise<TeamRoleResponseDto> {
    return this.teamRolesService.findOne(teamId, roleId);
  }

  @Put(':roleId')
  async update(
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @Body() updateData: UpdateTeamRoleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamRoleResponseDto> {
    await this.teamAccessService.assertCanManageTeam(teamId, req.user);
    return this.teamRolesService.update(teamId, roleId, updateData, req.user);
  }

  @Delete(':roleId')
  async remove(
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamRoleResponseDto> {
    await this.teamAccessService.assertCanManageTeam(teamId, req.user);
    return this.teamRolesService.remove(teamId, roleId, req.user);
  }
}
