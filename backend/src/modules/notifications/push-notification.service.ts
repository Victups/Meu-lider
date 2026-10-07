import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import Expo, { type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { User } from '../users/entities/user.entity';
import { Notification, NotificationType } from './entities/notification.entity';

export interface PushPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedScheduleId?: string;
  data?: Record<string, string>;
}

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

  async registerToken(userId: string, token: string): Promise<void> {
    if (!Expo.isExpoPushToken(token)) {
      this.logger.warn(`Token inválido recebido de userId=${userId}: ${token}`);
      return;
    }
    await this.usersRepository.update(userId, { expoPushToken: token });
  }

  async removeToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { expoPushToken: undefined });
  }

  async send(payload: PushPayload): Promise<void> {
    await this.sendMany([payload]);
  }

  async sendMany(payloads: PushPayload[]): Promise<void> {
    if (payloads.length === 0) return;

    const userIds = [...new Set(payloads.map((p) => p.userId))];
    const users = await this.usersRepository.find({
      where: { id: In(userIds) },
      select: { id: true, expoPushToken: true },
    });
    const tokenMap = new Map(users.map((u) => [u.id, u.expoPushToken]));

    const dbRows = payloads.map((p) =>
      this.notificationsRepository.create({
        userId: p.userId,
        title: p.title,
        message: p.message,
        type: p.type,
        relatedScheduleId: p.relatedScheduleId,
      }),
    );
    await this.notificationsRepository.save(dbRows);

    const pushMessages: ExpoPushMessage[] = [];
    for (const payload of payloads) {
      const token = tokenMap.get(payload.userId);
      if (!token || !Expo.isExpoPushToken(token)) continue;

      pushMessages.push({
        to: token,
        sound: 'default',
        title: payload.title,
        body: payload.message,
        data: payload.data ?? {},
      });
    }

    if (pushMessages.length === 0) return;

    const chunks = this.expo.chunkPushNotifications(pushMessages);
    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] = await this.expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            this.logger.warn(`Push error: ${ticket.message} (${ticket.details?.error})`);
          }
        }
      } catch (error) {
        this.logger.error(
          `Falha ao enviar push: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
