import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../../common/guards';
import type { AuthenticatedRequest } from '../../../common/interfaces';
import { AutoScheduleService } from './auto-schedule.service';
import { AutoScheduleResultDto } from './dtos/auto-schedule-result.dto';
import { GenerateScheduleDto } from './dtos/generate-schedule.dto';

@Controller('churches/:churchId/events/:eventId/auto-schedule')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
export class AutoScheduleController {
  constructor(private readonly autoScheduleService: AutoScheduleService) {}

  @Post()
  generate(
    @Param('churchId') churchId: string,
    @Param('eventId') eventId: string,
    @Body() options: GenerateScheduleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AutoScheduleResultDto> {
    return this.autoScheduleService.generateForEvent(churchId, eventId, options, req.user);
  }

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
