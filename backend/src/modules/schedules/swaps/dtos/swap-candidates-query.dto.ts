import { IsUUID } from 'class-validator';

export class SwapCandidatesQueryDto {
  @IsUUID()
  scheduleId: string;
}
