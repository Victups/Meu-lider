import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { MANAGER_ROLES } from '../../../common/constants';
import { Roles } from '../../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../../common/guards';
import type { AuthenticatedRequest } from '../../../common/interfaces';
import { MaterializeOccurrencesDto } from './dtos/materialize-occurrences.dto';
import {
  MaterializeOccurrencesResultDto,
  OccurrencesPreviewDto,
} from './dtos/occurrences-result.dto';
import { RecurrenceService } from './recurrence.service';

@Controller('churches/:churchId/events')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
export class RecurrenceController {
  constructor(private readonly recurrenceService: RecurrenceService) {}

  /** Materializes the next month for ALL recurring events in the church. */
  @Roles(...MANAGER_ROLES)
  @Post('materialize-month')
  materializeMonth(
    @Param('churchId') churchId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MaterializeOccurrencesResultDto[]> {
    return this.recurrenceService.materializeMonth(churchId, req.user);
  }

  /** Dates the rule would produce, without creating anything. */
  @Get(':eventId/occurrences/preview')
  preview(
    @Param('churchId') churchId: string,
    @Param('eventId') eventId: string,
    @Query() options: MaterializeOccurrencesDto,
  ): Promise<OccurrencesPreviewDto> {
    return this.recurrenceService.preview(churchId, eventId, options);
  }

  /** Creates the missing occurrences in the window. Safe to call again. */
  @Roles(...MANAGER_ROLES)
  @Post(':eventId/occurrences')
  materialize(
    @Param('churchId') churchId: string,
    @Param('eventId') eventId: string,
    @Body() options: MaterializeOccurrencesDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<MaterializeOccurrencesResultDto> {
    return this.recurrenceService.materialize(churchId, eventId, options, req.user);
  }
}
