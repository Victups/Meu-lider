import type { AutoScheduleResultDto } from '../../../schedules/auto-schedule/dtos/auto-schedule-result.dto';
import type { EventResponseDto } from '../../dtos/event-response.dto';

export class OccurrencesPreviewDto {
  templateEventId: string;
  recurrenceRule: string;
  horizon: Date;
  /** Dates the rule produces inside the window, before deduplication. */
  dates: Date[];
}

export class MaterializeOccurrencesResultDto {
  templateEventId: string;
  recurrenceRule: string;
  horizon: Date;
  createdCount: number;
  /** Occurrences that already existed — the idempotency evidence. */
  skippedCount: number;
  occurrences: EventResponseDto[];
  /** Present only when the caller asked for the roster to be built as well. */
  autoSchedule?: AutoScheduleResultDto[];
}
