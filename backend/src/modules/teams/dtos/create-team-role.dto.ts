import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTeamRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  /** Derived from the name when omitted. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultSlots?: number;

  /** Taken from the route when omitted — the path param is the source of truth. */
  @IsOptional()
  @IsUUID()
  teamId: string;
}
