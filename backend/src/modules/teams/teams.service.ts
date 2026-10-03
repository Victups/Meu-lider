import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import {
  ChurchAccessDeniedException,
  ResourceNotFoundException,
  TeamSlugAlreadyExistsException,
} from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { UserRole } from '../users/entities/user.entity';
import { CreateTeamDto } from './dtos/create-team.dto';
import { TeamMemberResponseDto } from './dtos/team-member-response.dto';
import { TeamResponseDto } from './dtos/team-response.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';
import type { ITeamsService } from './interfaces/teams-service.interface';
import { toTeamMemberDetailList } from './mappers/team-member-detail.mapper';
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
    const teamMember = this.teamMembersRepository.create({ teamId, memberId, role });
    return toTeamMemberSummary(await this.teamMembersRepository.save(teamMember));
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
