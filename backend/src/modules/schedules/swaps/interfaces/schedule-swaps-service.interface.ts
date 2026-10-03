import type { JwtUser } from '../../../../common/interfaces';
import type { CreateScheduleSwapDto } from '../dtos/create-schedule-swap.dto';
import type { ListScheduleSwapsDto } from '../dtos/list-schedule-swaps.dto';
import type { ResolveScheduleSwapDto } from '../dtos/resolve-schedule-swap.dto';
import type { ScheduleSwapResponseDto } from '../dtos/schedule-swap-response.dto';

export interface IScheduleSwapsService {
  request(
    churchId: string,
    createDto: CreateScheduleSwapDto,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto>;
  findByChurch(churchId: string, filters: ListScheduleSwapsDto): Promise<ScheduleSwapResponseDto[]>;
  findOne(churchId: string, swapId: string): Promise<ScheduleSwapResponseDto>;
  accept(churchId: string, swapId: string, user: JwtUser): Promise<ScheduleSwapResponseDto>;
  decline(churchId: string, swapId: string, user: JwtUser): Promise<ScheduleSwapResponseDto>;
  cancel(churchId: string, swapId: string, user: JwtUser): Promise<ScheduleSwapResponseDto>;
  resolve(
    churchId: string,
    swapId: string,
    resolveDto: ResolveScheduleSwapDto,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto>;
}
