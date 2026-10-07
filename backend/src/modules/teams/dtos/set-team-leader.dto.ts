import { IsBoolean } from 'class-validator';

export class SetTeamLeaderDto {
  @IsBoolean()
  isLeader: boolean;
}
