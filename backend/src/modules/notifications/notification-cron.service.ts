import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { formatEventWhen } from '../../common/utils';
import { Schedule, ScheduleStatus } from '../schedules/entities/schedule.entity';
import { Notification, NotificationType } from './entities/notification.entity';
import { PushNotificationService, type PushPayload } from './push-notification.service';

/** Hours before the event at which a reminder goes out. */
export const REMINDER_HOURS = [24, 12, 1] as const;

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/**
 * How late a reminder may still go out once its window opened. Past this it is
 * stale (the server was down) and is dropped instead of arriving out of context.
 */
function latenessToleranceMs(hours: number): number {
  return hours === 1 ? 30 * MINUTE_MS : 60 * MINUTE_MS;
}

function windowLabel(hours: number): string {
  return hours === 1 ? '1 hora' : `${hours} horas`;
}

/**
 * Reminds scheduled members 24h, 12h and 1h before the event.
 *
 * Runs often and is idempotent: a (schedule, member, window) that already has a
 * notification is never sent again, so the cadence of the cron does not matter.
 * Someone assigned after a window opened is skipped for it — they were told
 * about the assignment moments ago, a reminder on top would be noise.
 */
@Injectable()
export class NotificationCronService {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    private readonly pushService: PushNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron(): Promise<void> {
    try {
      await this.sendScheduleReminders();
    } catch (error) {
      this.logger.error(
        `Falha ao enviar lembretes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendScheduleReminders(now: Date = new Date()): Promise<number> {
    const horizon = new Date(now.getTime() + Math.max(...REMINDER_HOURS) * HOUR_MS);

    const schedules = await this.schedulesRepository.find({
      where: {
        status: In([ScheduleStatus.SCHEDULED, ScheduleStatus.CONFIRMED]),
        event: { active: true, eventDate: Between(now, horizon) },
      },
      relations: { event: true, member: true, teamRole: true },
    });

    if (schedules.length === 0) return 0;

    const alreadySent = await this.loadSentKeys(schedules.map((schedule) => schedule.id));
    const payloads: PushPayload[] = [];

    for (const schedule of schedules) {
      const userId = schedule.member?.userId;
      if (!userId) continue;

      for (const hours of REMINDER_HOURS) {
        if (!this.isDue(schedule, hours, now)) continue;
        if (alreadySent.has(this.key(schedule.id, userId, hours))) continue;

        payloads.push({
          userId,
          title: `${schedule.event.name} em ${windowLabel(hours)}`,
          message: `Você está escalado(a) como ${schedule.teamRole?.name ?? 'membro'} — ${formatEventWhen(schedule.event.eventDate)}.`,
          type: NotificationType.SCHEDULE_REMINDER,
          relatedScheduleId: schedule.id,
          relatedEventId: schedule.eventId,
          reminderHours: hours,
        });
      }
    }

    if (payloads.length > 0) {
      this.logger.log(`Enviando ${payloads.length} lembrete(s) de escala`);
      await this.pushService.sendMany(payloads);
    }

    return payloads.length;
  }

  private isDue(schedule: Schedule, hours: number, now: Date): boolean {
    const windowOpensAt = schedule.event.eventDate.getTime() - hours * HOUR_MS;
    const lateness = now.getTime() - windowOpensAt;

    if (lateness < 0 || lateness > latenessToleranceMs(hours)) return false;

    return schedule.createdAt.getTime() <= windowOpensAt;
  }

  private async loadSentKeys(scheduleIds: string[]): Promise<Set<string>> {
    const sent = await this.notificationsRepository.find({
      where: { relatedScheduleId: In(scheduleIds), type: NotificationType.SCHEDULE_REMINDER },
      select: { relatedScheduleId: true, userId: true, reminderHours: true },
    });

    return new Set(
      sent.map((row) => this.key(row.relatedScheduleId ?? '', row.userId, row.reminderHours ?? 0)),
    );
  }

  private key(scheduleId: string, userId: string, hours: number): string {
    return `${scheduleId}:${userId}:${hours}`;
  }
}
