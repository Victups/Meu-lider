import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ChurchGuard, JwtAuthGuard } from '../../../common/guards';
import type { AuthenticatedRequest } from '../../../common/interfaces';
import { AutoScheduleService } from './auto-schedule.service';
import { AutoScheduleResultDto } from './dtos/auto-schedule-result.dto';
import { GenerateScheduleDto } from './dtos/generate-schedule.dto';

@Controller('churches/:churchId/events/:eventId/auto-schedule')
@UseGuards(JwtAuthGuard, ChurchGuard)
export class AutoScheduleController {
  constructor(private readonly autoScheduleService: AutoScheduleService) {}

  /** Fills every open position of the event. Safe to call again: it only adds. */
  @Post()
  generate(
    @Param('churchId') churchId: string,
    @Param('eventId') eventId: string,
    @Body() options: GenerateScheduleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AutoScheduleResultDto> {
    return this.autoScheduleService.generateForEvent(churchId, eventId, options, req.user);
  }

  /** Same ranking, nothing written — lets the leader see the roster first. */
  @Post('preview')
  preview(
    @Param('churchId') churchId: string,
    @Param('eventId') eventId: string,
    @Body() options: GenerateScheduleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AutoScheduleResultDto> {
    return this.autoScheduleService.generateForEvent(
      churchId,
      eventId,
      { ...options, dryRun: true },
      req.user,
    );
  }
}
