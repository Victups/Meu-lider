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
import { MANAGER_ROLES } from '../../common/constants';
import { Roles } from '../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { AuthenticatedRequest } from '../../common/interfaces';
import { CreateTeamRoleDto } from './dtos/create-team-role.dto';
import { TeamRoleResponseDto } from './dtos/team-role-response.dto';
import { UpdateTeamRoleDto } from './dtos/update-team-role.dto';
import { TeamRolesService } from './team-roles.service';

@Controller('churches/:churchId/teams/:teamId/roles')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
export class TeamRolesController {
  constructor(private readonly teamRolesService: TeamRolesService) {}

  @Get()
  findByTeam(@Param('teamId') teamId: string): Promise<TeamRoleResponseDto[]> {
    return this.teamRolesService.findByTeam(teamId);
  }

  @Post()
  @Roles(...MANAGER_ROLES)
  create(
    @Param('teamId') teamId: string,
    @Body() createTeamRoleDto: CreateTeamRoleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamRoleResponseDto> {
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
  @Roles(...MANAGER_ROLES)
  update(
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @Body() updateData: UpdateTeamRoleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamRoleResponseDto> {
    return this.teamRolesService.update(teamId, roleId, updateData, req.user);
  }

  @Delete(':roleId')
  @Roles(...MANAGER_ROLES)
  remove(
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<TeamRoleResponseDto> {
    return this.teamRolesService.remove(teamId, roleId, req.user);
  }
}
