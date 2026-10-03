import { IsUUID } from 'class-validator';

/** Admin hand-over: the request is closed onto a member chosen by the leader. */
export class ResolveScheduleSwapDto {
  @IsUUID()
  acceptedByMemberId: string;
}
