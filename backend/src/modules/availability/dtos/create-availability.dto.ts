import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAvailabilityDto {
  /** Taken from the route when omitted — the path param is the source of truth. */
  @IsOptional()
  @IsUUID()
  memberId: string;

  @Type(() => Date)
  @IsDate()
  dateFrom: Date;

  @Type(() => Date)
  @IsDate()
  dateTo: Date;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
