import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  teamRoleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
