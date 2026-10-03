import { IsBoolean, IsOptional } from 'class-validator';

export class AssignTeamRoleDto {
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
