import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { RECURRENCE_MAX_WEEKS_AHEAD } from '../../../../common/constants';

export class MaterializeOccurrencesDto {
  /** How far ahead to materialize. Defaults to RECURRENCE_DEFAULT_WEEKS_AHEAD. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RECURRENCE_MAX_WEEKS_AHEAD)
  weeksAhead?: number;

  /** Hard cut-off date (AAAA-MM-DD, inclusive) instead of a week window. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'until deve estar no formato AAAA-MM-DD' })
  until?: string;

  /** Run the scheduling engine over each occurrence that was created. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoSchedule?: boolean;
}
