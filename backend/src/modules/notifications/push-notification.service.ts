import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import Expo, { type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { User } from '../users/entities/user.entity';
import { Notification, NotificationType } from './entities/notification.entity';

export interface PushPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedScheduleId?: string;
  relatedEventId?: string;
  relatedSwapId?: string;
  reminderHours?: number;
}

/**
 * Every notification is stored first (it is the in-app inbox) and then pushed
 * to the user's device when a token is registered. A push that cannot be
 * delivered never fails the action that triggered it.
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async registerToken(userId: string, token: string): Promise<boolean> {
    if (!Expo.isExpoPushToken(token)) {
      this.logger.warn(`Token inválido recebido de userId=${userId}`);
      return false;
    }

    // A device that switched accounts must stop receiving the previous user's pushes.
    await this.usersRepository.update({ expoPushToken: token, id: Not(userId) }, { expoPushToken: null });
    await this.usersRepository.update(userId, { expoPushToken: token });
    return true;
  }

  async removeToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { expoPushToken: null });
  }

  async send(payload: PushPayload): Promise<void> {
    await this.sendMany([payload]);
  }

  async sendMany(payloads: PushPayload[]): Promise<void> {
    if (payloads.length === 0) return;

    const saved = await this.notificationsRepository.save(
      payloads.map((payload) =>
        this.notificationsRepository.create({
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          relatedScheduleId: payload.relatedScheduleId ?? null,
          relatedEventId: payload.relatedEventId ?? null,
          relatedSwapId: payload.relatedSwapId ?? null,
          reminderHours: payload.reminderHours ?? null,
        }),
      ),
    );

    try {
      await this.push(saved);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar push: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async push(notifications: Notification[]): Promise<void> {
    const users = await this.usersRepository.find({
      where: { id: In([...new Set(notifications.map((n) => n.userId))]) },
      select: { id: true, expoPushToken: true },
    });
    const tokenByUser = new Map(users.map((user) => [user.id, user.expoPushToken]));

    const messages: ExpoPushMessage[] = [];
    const recipients: string[] = [];

    for (const notification of notifications) {
      const token = tokenByUser.get(notification.userId);
      if (!token || !Expo.isExpoPushToken(token)) continue;

      messages.push({
        to: token,
        sound: 'default',
        title: notification.title,
        body: notification.message,
        data: this.buildData(notification),
      });
      recipients.push(notification.userId);
    }

    let offset = 0;
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      const chunkRecipients = recipients.slice(offset, offset + chunk.length);
      offset += chunk.length;

      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        await this.handleTickets(tickets, chunkRecipients);
      } catch (error) {
        this.logger.error(
          `Falha ao enviar lote de push: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async handleTickets(tickets: ExpoPushTicket[], recipients: string[]): Promise<void> {
    for (const [index, ticket] of tickets.entries()) {
      if (ticket.status !== 'error') continue;

      this.logger.warn(`Push recusado: ${ticket.message}`);

      // The app was uninstalled or the token expired: stop sending to it.
      if (ticket.details?.error === 'DeviceNotRegistered' && recipients[index]) {
        await this.removeToken(recipients[index]);
      }
    }
  }

  /** What the app needs to route a tapped notification. */
  private buildData(notification: Notification): Record<string, string> {
    const data: Record<string, string> = {
      notificationId: notification.id,
      type: notification.type,
    };

    if (notification.relatedEventId) data.eventId = notification.relatedEventId;
    if (notification.relatedSwapId) data.swapId = notification.relatedSwapId;
    if (notification.relatedScheduleId) data.scheduleId = notification.relatedScheduleId;

    return data;
  }
}
