import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateScheduleSwapDto {
  @IsUUID()
  scheduleId: string;

  /** Leave empty to open the call to the whole team. */
  @IsOptional()
  @IsUUID()
  targetMemberId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
