import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestReleaseDto {
  /** Required: the leader rules on the request, and needs the context. */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class LeaderReleaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
