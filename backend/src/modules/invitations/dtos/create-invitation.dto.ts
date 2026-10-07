import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const INVITATION_DEFAULT_DAYS = 7;
export const INVITATION_MAX_DAYS = 90;

export class CreateInvitationDto {
  /** Whoever signs up with the code also joins this team. */
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(INVITATION_MAX_DAYS)
  expiresInDays?: number;

  /** Leave empty for unlimited uses until it expires. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxUses?: number;
}
