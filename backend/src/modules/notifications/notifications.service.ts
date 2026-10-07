import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import { ResourceNotFoundException } from '../../common/exceptions';
import { NotificationResponseDto } from './dtos/notification-response.dto';
import { Notification } from './entities/notification.entity';
import type { INotificationsService } from './interfaces/notifications-service.interface';
import {
  toNotificationResponse,
  toNotificationResponseList,
} from './mappers/notification.mapper';

const INBOX_LIMIT = 100;

@Injectable()
export class NotificationsService implements INotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async findOne(id: string, userId: string): Promise<NotificationResponseDto> {
    return toNotificationResponse(await this.findOwned(id, userId));
  }

  async findByUser(userId: string, unreadOnly = false): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationsRepository.find({
      where: unreadOnly ? { userId, isRead: false } : { userId },
      order: { createdAt: 'DESC' },
      take: INBOX_LIMIT,
    });

    return toNotificationResponseList(notifications);
  }

  countUnread(userId: string): Promise<number> {
    return this.notificationsRepository.count({ where: { userId, isRead: false } });
  }

  async markAsRead(id: string, userId: string): Promise<NotificationResponseDto> {
    const notification = await this.findOwned(id, userId);

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationsRepository.save(notification);
    }

    return toNotificationResponse(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.findOwned(id, userId);
    await this.notificationsRepository.delete(notification.id);
  }

  /** A notification that belongs to someone else is reported as not found. */
  private async findOwned(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({ where: { id, userId } });

    if (!notification) {
      throw new ResourceNotFoundException(ResourceType.NOTIFICATION, id);
    }

    return notification;
  }
}
