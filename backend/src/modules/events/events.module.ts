import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesModule } from '../schedules/schedules.module';
import { Event } from './entities/event.entity';
import { EventTeam } from './entities/event-team.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { RecurrenceController } from './recurrence/recurrence.controller';
import { RecurrenceService } from './recurrence/recurrence.service';

@Module({
  // SchedulesModule provides AutoScheduleService so a materialized occurrence
  // can get its roster in the same call. The dependency only goes this way.
  imports: [TypeOrmModule.forFeature([Event, EventTeam]), SchedulesModule],
  controllers: [EventsController, RecurrenceController],
  providers: [EventsService, RecurrenceService],
  exports: [EventsService, RecurrenceService],
})
export class EventsModule {}
