import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/entities/event.entity';
import { Member } from '../members/entities/member.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { NotificationCronService } from './notification-cron.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, Schedule, Event, Member]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationService, NotificationCronService],
  exports: [NotificationsService, PushNotificationService],
})
export class NotificationsModule {}
