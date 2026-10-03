import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(3)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  /** Taken from the route when omitted — the path param is the source of truth. */
  @IsOptional()
  @IsUUID()
  churchId: string;
}
