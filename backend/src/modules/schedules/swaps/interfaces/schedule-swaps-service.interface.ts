import type { JwtUser } from '../../../../common/interfaces';
import type { CreateScheduleSwapDto } from '../dtos/create-schedule-swap.dto';
import type { ListScheduleSwapsDto } from '../dtos/list-schedule-swaps.dto';
import type { ResolveScheduleSwapDto } from '../dtos/resolve-schedule-swap.dto';
import type {
  MySwapsDto,
  ScheduleSwapResponseDto,
  SwapCandidateMemberDto,
} from '../dtos/schedule-swap-response.dto';
import type { ScheduleResponseDto } from '../../dtos/schedule-response.dto';

export interface IScheduleSwapsService {
  request(
    churchId: string,
    createDto: CreateScheduleSwapDto,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto>;
  findByChurch(churchId: string, filters: ListScheduleSwapsDto): Promise<ScheduleSwapResponseDto[]>;
  findMine(churchId: string, user: JwtUser): Promise<MySwapsDto>;
  findOne(churchId: string, swapId: string): Promise<ScheduleSwapResponseDto>;
  /** Colleagues' schedules the requester could trade days with. */
  findExchangeCandidates(
    churchId: string,
    scheduleId: string,
    user: JwtUser,
  ): Promise<ScheduleResponseDto[]>;
  /** Team members who could take the slot over outright. */
  findHandoverCandidates(
    churchId: string,
    scheduleId: string,
    user: JwtUser,
  ): Promise<SwapCandidateMemberDto[]>;
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
