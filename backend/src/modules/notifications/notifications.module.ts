import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from '../schedules/entities/schedule.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { LeaderNotificationsService } from './leader-notifications.service';
import { NotificationCronService } from './notification-cron.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Schedule, TeamMember])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushNotificationService,
    LeaderNotificationsService,
    NotificationCronService,
  ],
  exports: [NotificationsService, PushNotificationService, LeaderNotificationsService],
})
export class NotificationsModule {}
