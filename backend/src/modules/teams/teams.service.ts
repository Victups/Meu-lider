import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CHURCH_MANAGER_ROLES, ResourceType } from '../../common/constants';
import {
  ChurchAccessDeniedException,
  ResourceNotFoundException,
  TeamSlugAlreadyExistsException,
} from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { Member } from '../members/entities/member.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateTeamDto } from './dtos/create-team.dto';
import { TeamMemberResponseDto } from './dtos/team-member-response.dto';
import { TeamResponseDto } from './dtos/team-response.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';
import type { ITeamsService } from './interfaces/teams-service.interface';
import { toTeamMemberDetail, toTeamMemberDetailList } from './mappers/team-member-detail.mapper';
import { toTeamMemberSummary } from './mappers/team-member.mapper';
import { toTeamResponse, toTeamResponseList } from './mappers/team.mapper';

@Injectable()
export class TeamsService implements ITeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
  ) {}

  async create(createTeamDto: CreateTeamDto, user: JwtUser): Promise<TeamResponseDto> {
    this.assertChurchAccess(user, createTeamDto.churchId);

    const existingTeam = await this.teamsRepository.findOne({
      where: { churchId: createTeamDto.churchId, slug: createTeamDto.slug },
    });

    if (existingTeam) {
      throw new TeamSlugAlreadyExistsException(createTeamDto.slug, createTeamDto.churchId);
    }

    const team = this.teamsRepository.create(createTeamDto);
    return toTeamResponse(await this.teamsRepository.save(team));
  }

  async findOne(id: string): Promise<TeamResponseDto> {
    return toTeamResponse(await this.findTeamEntity(id));
  }

  async findByChurch(churchId: string): Promise<TeamResponseDto[]> {
    const teams = await this.teamsRepository.find({
      where: { churchId, active: true },
      relations: { members: true },
    });

    return toTeamResponseList(teams);
  }

  async findLedBy(churchId: string, user: JwtUser): Promise<TeamResponseDto[]> {
    const teams = await this.teamsRepository.find({
      where: CHURCH_MANAGER_ROLES.includes(user.role)
        ? { churchId, active: true }
        : { churchId, active: true, members: { isLeader: true, member: { userId: user.id } } },
      order: { name: 'ASC' },
    });

    return toTeamResponseList(teams);
  }

  async update(id: string, updateData: UpdateTeamDto, user: JwtUser): Promise<TeamResponseDto> {
    const team = await this.findTeamEntity(id);
    this.assertChurchAccess(user, team.churchId);

    Object.assign(team, updateData);
    return toTeamResponse(await this.teamsRepository.save(team));
  }

  async remove(id: string, user: JwtUser): Promise<TeamResponseDto> {
    const team = await this.findTeamEntity(id);
    this.assertChurchAccess(user, team.churchId);

    team.active = false;
    return toTeamResponse(await this.teamsRepository.save(team));
  }

  async addMember(
    teamId: string,
    memberId: string,
    role?: string,
  ): Promise<TeamMemberResponseDto> {
    // A team only ever holds people from its own church.
    const [team, member] = await Promise.all([
      this.findTeamEntity(teamId),
      this.teamMembersRepository.manager.findOne(Member, { where: { id: memberId } }),
    ]);

    if (!member) {
      throw new ResourceNotFoundException(ResourceType.MEMBER, memberId);
    }

    if (member.churchId !== team.churchId) {
      throw new ChurchAccessDeniedException(team.churchId);
    }

    const teamMember = this.teamMembersRepository.create({ teamId, memberId, role });
    return toTeamMemberSummary(await this.teamMembersRepository.save(teamMember));
  }

  async setLeader(
    teamId: string,
    memberId: string,
    isLeader: boolean,
  ): Promise<TeamMemberResponseDto> {
    const teamMember = await this.teamMembersRepository.findOne({
      where: { teamId, memberId },
      relations: { member: { user: true } },
    });

    if (!teamMember) {
      throw new ResourceNotFoundException(ResourceType.TEAM_MEMBER, memberId);
    }

    teamMember.isLeader = isLeader;
    await this.teamMembersRepository.save(teamMember);

    await this.syncAccountRole(memberId, teamMember.member.user);

    return toTeamMemberDetail(teamMember);
  }

  /**
   * The account role only says someone leads *something* (it gates the screens);
   * which teams is `team_members.isLeader`. Pastors, presbyters and admins keep
   * their own role: leading a team never demotes or replaces it.
   */
  private async syncAccountRole(memberId: string, user: User): Promise<void> {
    const leading = await this.teamMembersRepository.count({
      where: { memberId, isLeader: true, team: { active: true } },
    });

    if (leading > 0 && user.role === UserRole.MEMBER) {
      await this.teamMembersRepository.manager.update(User, user.id, { role: UserRole.LEADER });
    } else if (leading === 0 && user.role === UserRole.LEADER) {
      await this.teamMembersRepository.manager.update(User, user.id, { role: UserRole.MEMBER });
    }
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    await this.teamMembersRepository.delete({ teamId, memberId });
  }

  async getTeamMembers(teamId: string): Promise<TeamMemberResponseDto[]> {
    const teamMembers = await this.teamMembersRepository.find({
      where: { teamId },
      relations: { member: { user: true } },
    });

    return toTeamMemberDetailList(teamMembers);
  }

  private async findTeamEntity(id: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id, active: true },
      relations: { members: { member: true } },
    });

    if (!team) {
      throw new ResourceNotFoundException(ResourceType.TEAM, id);
    }

    return team;
  }

  private assertChurchAccess(user: JwtUser, churchId: string): void {
    if (user.role !== UserRole.SUPER_ADMIN && user.churchId !== churchId) {
      throw new ChurchAccessDeniedException(churchId);
    }
  }
}
