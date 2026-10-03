import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Availability } from '../availability/entities/availability.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { TeamRole } from '../teams/entities/team-role.entity';
import { Event } from '../events/entities/event.entity';
import { Schedule } from './entities/schedule.entity';
import { ScheduleSwap } from './entities/schedule-swap.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { AutoScheduleController } from './auto-schedule/auto-schedule.controller';
import { AutoScheduleService } from './auto-schedule/auto-schedule.service';
import { ScheduleSwapsController } from './swaps/schedule-swaps.controller';
import { ScheduleSwapsService } from './swaps/schedule-swaps.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      ScheduleSwap,
      TeamRole,
      TeamMember,
      Availability,
      Event,
    ]),
  ],
  controllers: [SchedulesController, AutoScheduleController, ScheduleSwapsController],
  providers: [SchedulesService, AutoScheduleService, ScheduleSwapsService],
  exports: [SchedulesService, AutoScheduleService, ScheduleSwapsService],
})
export class SchedulesModule {}
