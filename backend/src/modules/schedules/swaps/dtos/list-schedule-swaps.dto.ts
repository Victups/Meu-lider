import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SwapStatus } from '../../entities/schedule-swap.entity';

export class ListScheduleSwapsDto {
  /** Defaults to the open calls, which is what a member browsing wants to see. */
  @IsOptional()
  @IsEnum(SwapStatus)
  status?: SwapStatus;

  @IsOptional()
  @IsUUID()
  scheduleId?: string;
}
