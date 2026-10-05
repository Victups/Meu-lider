import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  RECURRENCE_DEFAULT_WEEKS_AHEAD,
  ResourceType,
  SCHEDULE_MANAGER_ROLES,
} from '../../../common/constants';
import {
  ChurchAccessDeniedException,
  EventNotRecurringException,
  InsufficientPermissionException,
  ResourceNotFoundException,
} from '../../../common/exceptions';
import type { JwtUser } from '../../../common/interfaces';
import { addWeeks, endOfDay, startOfDay } from '../../../common/utils';
import { AutoScheduleService } from '../../schedules/auto-schedule/auto-schedule.service';
import { Event } from '../entities/event.entity';
import { EventTeam } from '../entities/event-team.entity';
import { toEventResponseList } from '../mappers/event.mapper';
import { MaterializeOccurrencesDto } from './dtos/materialize-occurrences.dto';
import {
  MaterializeOccurrencesResultDto,
  OccurrencesPreviewDto,
} from './dtos/occurrences-result.dto';
import type { IRecurrenceService } from './interfaces';
import { expandRecurrence, parseRecurrenceRule } from './recurrence.util';

/**
 * "Os eventos constantes que vão sempre ter" — the Sunday service, the Thursday
 * rehearsal — expanded from `Event.recurrenceRule` into real rows.
 *
 * Occurrences are MATERIALIZED, not computed on the fly, because each one grows
 * its own state the moment it exists: its roster, the confirmations on it, the
 * swap requests against it, a cancellation of that one week. A virtual
 * occurrence has no id to hang any of that on. The cost is that the series has
 * to be extended now and then, so materialization runs over a window (eight
 * weeks by default) and is safe to repeat: an occurrence that already exists is
 * counted as skipped instead of duplicated.
 *
 * Generated occurrences carry `recurrenceRule = null`. Only the template event
 * drives the series, so expanding it twice can never fan out exponentially.
 *
 * Past dates are never backfilled: a rule anchored six months ago starts
 * producing rows from today, not from the anchor.
 */
@Injectable()
export class RecurrenceService implements IRecurrenceService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(EventTeam)
    private readonly eventTeamsRepository: Repository<EventTeam>,
    private readonly autoScheduleService: AutoScheduleService,
  ) {}

  async preview(
    churchId: string,
    eventId: string,
    options: MaterializeOccurrencesDto,
  ): Promise<OccurrencesPreviewDto> {
    const template = await this.findRecurringTemplate(churchId, eventId);
    const horizon = this.resolveHorizon(options);

    return {
      templateEventId: template.id,
      recurrenceRule: template.recurrenceRule,
      horizon,
      dates: this.expandUpcoming(template, horizon),
    };
  }

  async materialize(
    churchId: string,
    eventId: string,
    options: MaterializeOccurrencesDto,
    user: JwtUser,
  ): Promise<MaterializeOccurrencesResultDto> {
    this.assertCanManageSchedules(user);

    const template = await this.findRecurringTemplate(churchId, eventId);
    const horizon = this.resolveHorizon(options);
    const dates = this.expandUpcoming(template, horizon);

    const missingDates = await this.rejectExistingOccurrences(template, dates);
    const created = missingDates.length
      ? await this.eventsRepository.save(
          missingDates.map((date) => this.buildOccurrence(template, date, user)),
        )
      : [];

    if (created.length > 0) {
      await this.copyTeamLinks(template.id, created.map((e) => e.id));
    }

    return {
      templateEventId: template.id,
      recurrenceRule: template.recurrenceRule,
      horizon,
      createdCount: created.length,
      skippedCount: dates.length - missingDates.length,
      occurrences: toEventResponseList(created),
      autoSchedule: options.autoSchedule
        ? await this.autoScheduleService.generateForEvents(
            churchId,
            created.map((event) => event.id),
            {},
            user,
          )
        : undefined,
    };
  }

  /** Dates the rule produces from today up to the horizon. */
  private expandUpcoming(template: Event, horizon: Date): Date[] {
    const pattern = parseRecurrenceRule(template.recurrenceRule);
    const floor = startOfDay(new Date()).getTime();

    return expandRecurrence(template.eventDate, pattern, horizon).filter(
      (date) => date.getTime() >= floor,
    );
  }

  /**
   * Idempotence key. There is no parentEventId column, so an occurrence is
   * recognised by church + name + exact start — the natural key of a series.
   */
  private async rejectExistingOccurrences(template: Event, dates: Date[]): Promise<Date[]> {
    if (dates.length === 0) {
      return [];
    }

    const existing = await this.eventsRepository.find({
      where: {
        churchId: template.churchId,
        name: template.name,
        eventDate: In(dates),
      },
      select: { id: true, eventDate: true },
    });

    const taken = new Set(existing.map((event) => event.eventDate.getTime()));

    return dates.filter((date) => !taken.has(date.getTime()));
  }

  private buildOccurrence(template: Event, eventDate: Date, user: JwtUser): Event {
    const durationMs = template.endDate
      ? template.endDate.getTime() - template.eventDate.getTime()
      : null;

    return this.eventsRepository.create({
      churchId: template.churchId,
      name: template.name,
      description: template.description,
      eventType: template.eventType,
      eventDate,
      location: template.location,
      endDate: durationMs === null ? undefined : new Date(eventDate.getTime() + durationMs),
      active: true,
      // Only the template drives the series; the occurrence is a plain event.
      recurrenceRule: undefined,
      createdById: template.createdById ?? user.id,
    });
  }

  private resolveHorizon(options: MaterializeOccurrencesDto): Date {
    if (options.until) {
      return endOfDay(options.until);
    }

    return endOfDay(
      addWeeks(startOfDay(new Date()), options.weeksAhead ?? RECURRENCE_DEFAULT_WEEKS_AHEAD),
    );
  }

  private async findRecurringTemplate(churchId: string, eventId: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId, active: true } });

    if (!event) {
      throw new ResourceNotFoundException(ResourceType.EVENT, eventId);
    }

    if (event.churchId !== churchId) {
      throw new ChurchAccessDeniedException(churchId);
    }

    if (!event.recurrenceRule) {
      throw new EventNotRecurringException(eventId);
    }

    return event;
  }

  /**
   * Materializes the entire next month for every recurring event in a church,
   * with auto-schedule. Called by the monthly cron or manually by an admin.
   */
  async materializeMonth(
    churchId: string,
    user: JwtUser,
  ): Promise<MaterializeOccurrencesResultDto[]> {
    this.assertCanManageSchedules(user);

    const templates = await this.eventsRepository.find({
      where: { churchId, active: true },
    });

    const recurring = templates.filter((e) => e.recurrenceRule);

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

    const results: MaterializeOccurrencesResultDto[] = [];

    for (const template of recurring) {
      const pattern = parseRecurrenceRule(template.recurrenceRule);
      const allDates = expandRecurrence(template.eventDate, pattern, endOfNextMonth);
      const dates = allDates.filter((d) => d.getTime() >= nextMonth.getTime());

      const missingDates = await this.rejectExistingOccurrences(template, dates);
      const created = missingDates.length
        ? await this.eventsRepository.save(
            missingDates.map((date) => this.buildOccurrence(template, date, user)),
          )
        : [];

      if (created.length > 0) {
        await this.copyTeamLinks(template.id, created.map((e) => e.id));
      }

      const autoSchedule = created.length > 0
        ? await this.autoScheduleService.generateForEvents(
            churchId,
            created.map((e) => e.id),
            {},
            user,
          )
        : undefined;

      results.push({
        templateEventId: template.id,
        recurrenceRule: template.recurrenceRule,
        horizon: endOfNextMonth,
        createdCount: created.length,
        skippedCount: dates.length - missingDates.length,
        occurrences: toEventResponseList(created),
        autoSchedule,
      });
    }

    return results;
  }

  private async copyTeamLinks(templateEventId: string, occurrenceIds: string[]): Promise<void> {
    const templateTeams = await this.eventTeamsRepository.find({
      where: { eventId: templateEventId },
    });

    if (templateTeams.length === 0) return;

    const links = occurrenceIds.flatMap((eventId) =>
      templateTeams.map((tl) =>
        this.eventTeamsRepository.create({ eventId, teamId: tl.teamId }),
      ),
    );

    await this.eventTeamsRepository.save(links);
  }

  private assertCanManageSchedules(user: JwtUser): void {
    if (!SCHEDULE_MANAGER_ROLES.includes(user.role)) {
      throw new InsufficientPermissionException(
        'Apenas líderes e administradores podem gerar as ocorrências de um evento',
      );
    }
  }
}
