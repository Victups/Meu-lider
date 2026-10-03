import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateEventDto {
  /** Taken from the route when omitted — the path param is the source of truth. */
  @IsOptional()
  @IsUUID()
  churchId: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @Type(() => Date)
  @IsDate()
  eventDate: Date;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsString()
  recurrenceRule?: string;
}
