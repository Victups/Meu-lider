import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import {
  ChurchAccessDeniedException,
  ResourceNotFoundException,
  TeamRoleNotInTeamException,
  TeamRoleSlugAlreadyExistsException,
} from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { toDateOnlyString } from '../../common/utils';
import { UserRole } from '../users/entities/user.entity';
import { AssignTeamRoleDto } from './dtos/assign-team-role.dto';
import { CreateTeamRoleDto } from './dtos/create-team-role.dto';
import { TeamMemberRoleResponseDto } from './dtos/team-member-role-response.dto';
import { TeamMemberResponseDto } from './dtos/team-member-response.dto';
import { TeamRoleResponseDto } from './dtos/team-role-response.dto';
import { UpdateTeamRoleDto } from './dtos/update-team-role.dto';
import { TeamMember } from './entities/team-member.entity';
import { TeamMemberRole } from './entities/team-member-role.entity';
import { TeamRole } from './entities/team-role.entity';
import { Team } from './entities/team.entity';
import type { ITeamRolesService } from './interfaces/team-roles-service.interface';
import {
  toTeamMemberRoleResponse,
  toTeamMemberRoleResponseList,
} from './mappers/team-member-role.mapper';
import { toTeamMemberDetailList } from './mappers/team-member-detail.mapper';
import { toTeamRoleResponse, toTeamRoleResponseList } from './mappers/team-role.mapper';

@Injectable()
export class TeamRolesService implements ITeamRolesService {
  constructor(
    @InjectRepository(TeamRole)
    private readonly teamRolesRepository: Repository<TeamRole>,
    @InjectRepository(TeamMemberRole)
    private readonly teamMemberRolesRepository: Repository<TeamMemberRole>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
  ) {}

  async create(
    createTeamRoleDto: CreateTeamRoleDto,
    user: JwtUser,
  ): Promise<TeamRoleResponseDto> {
    const { teamId, name, slug, color, defaultSlots } = createTeamRoleDto;

    const team = await this.findTeamEntity(teamId);
    this.assertChurchAccess(user, team.churchId);

    const resolvedSlug = this.resolveSlug(slug, name);
    await this.assertSlugAvailable(teamId, resolvedSlug);

    const teamRole = this.teamRolesRepository.create({
      teamId,
      name,
      slug: resolvedSlug,
      color,
      defaultSlots,
    });

    return toTeamRoleResponse(await this.teamRolesRepository.save(teamRole));
  }

  async findByTeam(teamId: string): Promise<TeamRoleResponseDto[]> {
    const teamRoles = await this.teamRolesRepository.find({
      where: { teamId, active: true },
      order: { name: 'ASC' },
    });

    return toTeamRoleResponseList(teamRoles);
  }

  async findOne(teamId: string, roleId: string): Promise<TeamRoleResponseDto> {
    return toTeamRoleResponse(await this.findTeamRoleEntity(teamId, roleId));
  }

  /** Active people of the team who cover this position — who a leader may put in it. */
  async findMembersCoveringRole(teamId: string, roleId: string): Promise<TeamMemberResponseDto[]> {
    await this.findTeamRoleEntity(teamId, roleId);

    const today = toDateOnlyString(new Date());
    const teamMembers = await this.teamMembersRepository.find({
      where: { teamId, roles: { teamRoleId: roleId }, member: { status: 'active' } },
      relations: { member: true },
    });

    return toTeamMemberDetailList(
      teamMembers
        .filter((entry) => !entry.endedAt || toDateOnlyString(entry.endedAt) >= today)
        .sort((a, b) => a.member.fullName.localeCompare(b.member.fullName, 'pt-BR')),
    );
  }

  async update(
    teamId: string,
    roleId: string,
    updateData: UpdateTeamRoleDto,
    user: JwtUser,
  ): Promise<TeamRoleResponseDto> {
    const teamRole = await this.findTeamRoleEntity(teamId, roleId);
    const team = await this.findTeamEntity(teamId);
    this.assertChurchAccess(user, team.churchId);

    // The slug only moves when asked for: renaming "Vocal" to "Voz" must not
    // silently invalidate the identifier clients already store.
    const { slug, ...rest } = updateData;
    if (slug !== undefined) {
      const resolvedSlug = this.resolveSlug(slug, teamRole.name);
      await this.assertSlugAvailable(teamId, resolvedSlug, roleId);
      teamRole.slug = resolvedSlug;
    }

    Object.assign(teamRole, rest);

    return toTeamRoleResponse(await this.teamRolesRepository.save(teamRole));
  }

  async remove(teamId: string, roleId: string, user: JwtUser): Promise<TeamRoleResponseDto> {
    const teamRole = await this.findTeamRoleEntity(teamId, roleId);
    const team = await this.findTeamEntity(teamId);
    this.assertChurchAccess(user, team.churchId);

    // Soft delete: past schedules still point at this position (FK is RESTRICT).
    teamRole.active = false;
    return toTeamRoleResponse(await this.teamRolesRepository.save(teamRole));
  }

  async getMemberRoles(teamId: string, memberId: string): Promise<TeamMemberRoleResponseDto[]> {
    const teamMember = await this.findTeamMemberEntity(teamId, memberId);

    const assignments = await this.teamMemberRolesRepository.find({
      where: { teamMemberId: teamMember.id },
      relations: { teamRole: true },
    });

    return toTeamMemberRoleResponseList(assignments);
  }

  async assignRoleToMember(
    teamId: string,
    memberId: string,
    roleId: string,
    assignTeamRoleDto: AssignTeamRoleDto,
  ): Promise<TeamMemberRoleResponseDto> {
    const teamMember = await this.findTeamMemberEntity(teamId, memberId);
    const teamRole = await this.findTeamRoleEntity(teamId, roleId);
    const isPrimary = assignTeamRoleDto.isPrimary ?? false;

    if (isPrimary) {
      await this.demoteOtherPrimaryRoles(teamMember.id, teamRole.id);
    }

    // Re-assigning an existing position just moves the isPrimary flag, so the
    // app can toggle it without having to unassign first.
    const existing = await this.teamMemberRolesRepository.findOne({
      where: { teamMemberId: teamMember.id, teamRoleId: teamRole.id },
    });

    const assignment =
      existing ??
      this.teamMemberRolesRepository.create({
        teamMemberId: teamMember.id,
        teamRoleId: teamRole.id,
      });

    assignment.isPrimary = isPrimary;
    const saved = await this.teamMemberRolesRepository.save(assignment);

    return toTeamMemberRoleResponse({ ...saved, teamRole });
  }

  async removeRoleFromMember(teamId: string, memberId: string, roleId: string): Promise<void> {
    const teamMember = await this.findTeamMemberEntity(teamId, memberId);
    await this.teamMemberRolesRepository.delete({
      teamMemberId: teamMember.id,
      teamRoleId: roleId,
    });
  }

  private async demoteOtherPrimaryRoles(teamMemberId: string, teamRoleId: string): Promise<void> {
    await this.teamMemberRolesRepository.update(
      { teamMemberId, teamRoleId: Not(teamRoleId), isPrimary: true },
      { isPrimary: false },
    );
  }

  private resolveSlug(slug: string | undefined, name: string): string {
    const source = slug ?? name;

    return source
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // "Fotógrafo" -> "Fotografo"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async assertSlugAvailable(
    teamId: string,
    slug: string,
    exceptRoleId?: string,
  ): Promise<void> {
    const existing = await this.teamRolesRepository.findOne({ where: { teamId, slug } });

    if (existing && existing.id !== exceptRoleId) {
      throw new TeamRoleSlugAlreadyExistsException(slug, teamId);
    }
  }

  /** Inactive positions stay reachable here so an admin can reactivate them. */
  private async findTeamRoleEntity(teamId: string, roleId: string): Promise<TeamRole> {
    const teamRole = await this.teamRolesRepository.findOne({ where: { id: roleId } });

    if (!teamRole) {
      throw new ResourceNotFoundException(ResourceType.TEAM_ROLE, roleId);
    }

    if (teamRole.teamId !== teamId) {
      throw new TeamRoleNotInTeamException(roleId, teamId);
    }

    return teamRole;
  }

  private async findTeamMemberEntity(teamId: string, memberId: string): Promise<TeamMember> {
    const teamMember = await this.teamMembersRepository.findOne({
      where: { teamId, memberId },
    });

    if (!teamMember) {
      throw new ResourceNotFoundException(ResourceType.TEAM_MEMBER, memberId);
    }

    return teamMember;
  }

  private async findTeamEntity(teamId: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({ where: { id: teamId, active: true } });

    if (!team) {
      throw new ResourceNotFoundException(ResourceType.TEAM, teamId);
    }

    return team;
  }

  private assertChurchAccess(user: JwtUser, churchId: string): void {
    if (user.role !== UserRole.SUPER_ADMIN && user.churchId !== churchId) {
      throw new ChurchAccessDeniedException(churchId);
    }
  }
}
