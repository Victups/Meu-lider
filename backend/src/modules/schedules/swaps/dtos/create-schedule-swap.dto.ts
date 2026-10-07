import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateScheduleSwapDto {
  /** The slot the requester wants to get rid of. */
  @IsUUID()
  scheduleId: string;

  /**
   * Day exchange: the colleague's schedule the requester wants in return. The
   * colleague is whoever holds it, so `targetMemberId` is not needed.
   */
  @IsOptional()
  @IsUUID()
  counterScheduleId?: string;

  /** Plain hand-over to one person. Leave empty to open the call to the whole team. */
  @IsOptional()
  @IsUUID()
  targetMemberId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
