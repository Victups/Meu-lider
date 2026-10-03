import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  teamId: string;

  @IsUUID()
  memberId: string;

  @IsUUID()
  teamRoleId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
