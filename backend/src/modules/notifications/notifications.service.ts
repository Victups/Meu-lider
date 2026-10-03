import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import { ResourceNotFoundException } from '../../common/exceptions';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { NotificationResponseDto } from './dtos/notification-response.dto';
import { Notification } from './entities/notification.entity';
import type { INotificationsService } from './interfaces/notifications-service.interface';
import {
  toNotificationResponse,
  toNotificationResponseList,
} from './mappers/notification.mapper';

@Injectable()
export class NotificationsService implements INotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    const notification = this.notificationsRepository.create(createNotificationDto);
    return toNotificationResponse(await this.notificationsRepository.save(notification));
  }

  async findOne(id: string): Promise<NotificationResponseDto> {
    return toNotificationResponse(await this.findNotificationEntity(id));
  }

  async findByUser(userId: string, unreadOnly = false): Promise<NotificationResponseDto[]> {
    let query = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (unreadOnly) {
      query = query.andWhere('notification.isRead = :isRead', { isRead: false });
    }

    const notifications = await query.orderBy('notification.createdAt', 'DESC').getMany();
    return toNotificationResponseList(notifications);
  }

  async markAsRead(id: string): Promise<NotificationResponseDto> {
    const notification = await this.findNotificationEntity(id);

    notification.isRead = true;
    notification.readAt = new Date();

    return toNotificationResponse(await this.notificationsRepository.save(notification));
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async remove(id: string): Promise<void> {
    await this.notificationsRepository.delete(id);
  }

  private async findNotificationEntity(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
      relations: { user: true, relatedSchedule: true },
    });

    if (!notification) {
      throw new ResourceNotFoundException(ResourceType.NOTIFICATION, id);
    }

    return notification;
  }
}
