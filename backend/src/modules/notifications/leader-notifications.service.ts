import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatEventWhen, formatShortDate } from '../../common/utils';
import { TeamMember } from '../teams/entities/team-member.entity';
import { NotificationType } from './entities/notification.entity';
import { PushNotificationService, type PushPayload } from './push-notification.service';

export interface AnnouncedEvent {
  id: string;
  name: string;
  eventDate: Date;
}

/**
 * Tells team leaders about things that need their hand: a new event to staff, a
 * member asking out. Leadership comes from `team_members.isLeader` — the global
 * LEADER role only says someone leads *something*.
 */
@Injectable()
export class LeaderNotificationsService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    private readonly pushService: PushNotificationService,
  ) {}

  /** Distinct user ids of the leaders of the given teams (or of the whole church). */
  async findLeaderUserIds(churchId: string, teamIds?: string[]): Promise<string[]> {
    if (teamIds && teamIds.length === 0) return [];

    let query = this.teamMembersRepository
      .createQueryBuilder('teamMember')
      .innerJoin('teamMember.team', 'team')
      .innerJoin('teamMember.member', 'member')
      .select('member.userId', 'userId')
      .distinct(true)
      .where('teamMember.isLeader = true')
      .andWhere('team.churchId = :churchId', { churchId })
      .andWhere('team.active = true')
      .andWhere('(teamMember.endedAt IS NULL OR teamMember.endedAt >= CURRENT_DATE)');

    if (teamIds) {
      query = query.andWhere('teamMember.teamId IN (:...teamIds)', { teamIds });
    }

    const rows = await query.getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }

  /**
   * One push per leader no matter how many events were created at once — the
   * monthly generation makes a dozen at a time and must not become a dozen pushes.
   * `teamIds` limits the audience to the leaders of teams already linked to the
   * events; without it every leader of the church hears about it.
   */
  async notifyNewEvents(input: {
    churchId: string;
    events: AnnouncedEvent[];
    teamIds?: string[];
    excludeUserId?: string;
  }): Promise<void> {
    const { churchId, events, teamIds, excludeUserId } = input;
    if (events.length === 0) return;

    const leaders = (await this.findLeaderUserIds(churchId, teamIds)).filter(
      (userId) => userId !== excludeUserId,
    );
    if (leaders.length === 0) return;

    const ordered = [...events].sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const linked = teamIds !== undefined;

    const title = events.length === 1 ? `Novo evento: ${first.name}` : `${events.length} novos eventos`;
    const message =
      events.length === 1
        ? `${first.name} — ${formatEventWhen(first.eventDate)}. ${
            linked
              ? 'Sua equipe foi vinculada e a escala foi montada: confira.'
              : 'Vincule sua equipe e monte a escala.'
          }`
        : `Eventos de ${formatShortDate(first.eventDate)} a ${formatShortDate(last.eventDate)}. ${
            linked
              ? 'Sua equipe já está vinculada: confira as escalas.'
              : 'Vincule sua equipe e monte as escalas.'
          }`;

    await this.pushService.sendMany(
      leaders.map(
        (userId): PushPayload => ({
          userId,
          title,
          message,
          type: NotificationType.EVENT_CREATED,
          relatedEventId: first.id,
        }),
      ),
    );
  }

  /** Same message to every leader of one team, minus whoever caused it. */
  async notifyTeamLeaders(
    churchId: string,
    teamId: string,
    payload: Omit<PushPayload, 'userId'>,
    excludeUserId?: string,
  ): Promise<void> {
    const leaders = (await this.findLeaderUserIds(churchId, [teamId])).filter(
      (userId) => userId !== excludeUserId,
    );

    await this.pushService.sendMany(leaders.map((userId) => ({ ...payload, userId })));
  }
}
