import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Schedule, ScheduleStatus } from '../schedules/entities/schedule.entity';
import { Event } from '../events/entities/event.entity';
import { Member } from '../members/entities/member.entity';
import { NotificationType } from './entities/notification.entity';
import { PushNotificationService, type PushPayload } from './push-notification.service';

const REMINDER_WINDOWS_HOURS = [24, 12, 1] as const;

@Injectable()
export class NotificationCronService {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    private readonly pushService: PushNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendScheduleReminders(): Promise<void> {
    const now = new Date();

    for (const hoursAhead of REMINDER_WINDOWS_HOURS) {
      await this.sendRemindersForWindow(now, hoursAhead);
    }
  }

  private async sendRemindersForWindow(now: Date, hoursAhead: number): Promise<void> {
    const windowStart = new Date(now.getTime() + (hoursAhead - 0.5) * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (hoursAhead + 0.5) * 60 * 60 * 1000);

    const schedules = await this.schedulesRepository.find({
      where: {
        status: ScheduleStatus.SCHEDULED,
        event: { eventDate: Between(windowStart, windowEnd) },
      },
      relations: { event: true, member: true, teamRole: true },
    });

    if (schedules.length === 0) return;

    const label = this.formatTimeLabel(hoursAhead);
    const payloads: PushPayload[] = [];

    for (const schedule of schedules) {
      if (!schedule.member?.userId) continue;

      payloads.push({
        userId: schedule.member.userId,
        title: `Lembrete: ${schedule.event.name}`,
        message: `Faltam ${label} para o evento "${schedule.event.name}". Você está escalado(a) como ${schedule.teamRole?.name ?? 'membro'}.`,
        type: NotificationType.SCHEDULE_REMINDER,
        relatedScheduleId: schedule.id,
        data: { screen: 'event', eventId: schedule.eventId },
      });
    }

    if (payloads.length > 0) {
      this.logger.log(`Enviando ${payloads.length} lembretes (${label} antes)`);
      await this.pushService.sendMany(payloads);
    }
  }

  private formatTimeLabel(hours: number): string {
    if (hours >= 24) return '24 horas';
    if (hours >= 12) return '12 horas';
    return '1 hora';
  }
}
