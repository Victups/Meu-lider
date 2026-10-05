import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CHURCH_MANAGER_ROLES, FULL_VISIBILITY_ROLES } from '../../common/constants';
import { InsufficientPermissionException } from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { UserRole } from '../users/entities/user.entity';
import { TeamMember } from './entities/team-member.entity';

/**
 * Who may touch a given team's roster.
 *
 * The global LEADER role only says someone leads *something*; which teams comes
 * from `team_members.isLeader`. Without this check any leader in the church
 * could rewrite another team's schedule.
 */
@Injectable()
export class TeamAccessService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
  ) {}

  async leadsTeam(teamId: string, user: JwtUser): Promise<boolean> {
    const membership = await this.teamMembersRepository.findOne({
      where: { teamId, isLeader: true, member: { userId: user.id } },
      relations: { member: true },
    });

    return membership !== null;
  }

  /** Admins manage any team; anyone with isLeader on the team can manage it. */
  async canManageTeam(teamId: string, user: JwtUser): Promise<boolean> {
    if (CHURCH_MANAGER_ROLES.includes(user.role)) return true;

    return this.leadsTeam(teamId, user);
  }

  async assertCanManageTeam(teamId: string, user: JwtUser): Promise<void> {
    if (await this.canManageTeam(teamId, user)) return;

    throw new InsufficientPermissionException(
      'Você só pode alterar a escala das equipes que lidera',
    );
  }

  /**
   * Full rosters are visible to admins and to oversight roles (pastor,
   * presbyter); a leader sees the teams they lead. Everyone else gets the team
   * name only, handled by the caller.
   */
  async canViewTeamRoster(teamId: string, user: JwtUser): Promise<boolean> {
    if (FULL_VISIBILITY_ROLES.includes(user.role)) return true;

    return this.leadsTeam(teamId, user);
  }
}
