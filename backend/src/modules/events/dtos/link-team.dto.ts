import { IsBoolean, IsOptional } from 'class-validator';

export class LinkTeamDto {
  /** Also attach the team to every upcoming event with the same name. */
  @IsOptional()
  @IsBoolean()
  applyToSeries?: boolean;
}
