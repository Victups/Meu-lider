import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ChurchGuard, JwtAuthGuard } from '../../../common/guards';
import type { AuthenticatedRequest } from '../../../common/interfaces';
import { MaterializeOccurrencesDto } from './dtos/materialize-occurrences.dto';
import {
  MaterializeOccurrencesResultDto,
  OccurrencesPreviewDto,
} from './dtos/occurrences-result.dto';
import { RecurrenceService } from './recurrence.service';

@Controller('churches/:churchId/events/:eventId/occurrences')
@UseGuards(JwtAuthGuard, ChurchGuard)
export class RecurrenceController {
  constructor(private readonly recurrenceService: RecurrenceService) {}

  /** Dates the rule would produce, without creating anything. */
  @Get('preview')
  preview(
    @Param('churchId') churchId: string,
    @Param('eventId') eventId: string,
    @Query() options: MaterializeOccurrencesDto,
  ): Promise<OccurrencesPreviewDto> {
    return this.recurrenceService.preview(churchId, eventId, options);
  }

  /** Creates the missing occurrences in the window. Safe to call again. */
  @Post()
  materialize(
    @Param('churchId') churchId: string,
    @Param('eventId') eventId: string,
    @Body() options: MaterializeOccurrencesDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<MaterializeOccurrencesResultDto> {
    return this.recurrenceService.materialize(churchId, eventId, options, req.user);
  }
}
