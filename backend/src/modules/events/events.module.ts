import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Church } from '../churches/entities/church.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { User } from '../users/entities/user.entity';
import { Event } from './entities/event.entity';
import { EventTeam } from './entities/event-team.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { RecurrenceController } from './recurrence/recurrence.controller';
import { RecurrenceCronService } from './recurrence/recurrence-cron.service';
import { RecurrenceService } from './recurrence/recurrence.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventTeam, Church, User]), SchedulesModule],
  controllers: [EventsController, RecurrenceController],
  providers: [EventsService, RecurrenceService, RecurrenceCronService],
  exports: [EventsService, RecurrenceService],
})
export class EventsModule {}
