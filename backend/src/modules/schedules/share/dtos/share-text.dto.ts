import { IsOptional, IsUUID, Matches } from 'class-validator';

export class ShareTextQueryDto {
  /** `YYYY-MM`. */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month deve estar no formato AAAA-MM' })
  month: string;

  /** Limit the message to one team's roster. */
  @IsOptional()
  @IsUUID()
  teamId?: string;
}

export class ShareTextDto {
  month: string;
  text: string;
  /** How many events made it into the message. */
  eventCount: number;
}
