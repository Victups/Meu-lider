import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class GenerateScheduleDto {
  /**
   * Teams to staff. Omit to staff every active team of the church — there is no
   * event/team association in the schema yet, so "all teams" is the default.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds?: string[];

  /** Only fill these specific roles. Omit to fill every active role of the selected teams. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  /** Run the engine and return the proposal without writing any schedule. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
