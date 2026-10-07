import type { JwtUser } from '../../../common/interfaces';
import type { CreateScheduleDto } from '../dtos/create-schedule.dto';
import type { ScheduleResponseDto } from '../dtos/schedule-response.dto';
import type { UpdateScheduleDto } from '../dtos/update-schedule.dto';
import type { ScheduleStatistics } from './schedule-statistics.interface';

export interface ISchedulesService {
  create(createScheduleDto: CreateScheduleDto, user: JwtUser): Promise<ScheduleResponseDto>;
  findOne(id: string): Promise<ScheduleResponseDto>;
  findByEvent(eventId: string): Promise<ScheduleResponseDto[]>;
  findByMember(memberId: string): Promise<ScheduleResponseDto[]>;
  /** Member asks out, with a reason; the slot stays flagged until a leader rules. */
  requestRelease(id: string, reason: string, user: JwtUser): Promise<ScheduleResponseDto>;
  approveRelease(id: string, user: JwtUser): Promise<ScheduleResponseDto>;
  rejectRelease(id: string, user: JwtUser): Promise<ScheduleResponseDto>;
  releaseByLeader(
    id: string,
    reason: string | undefined,
    user: JwtUser,
  ): Promise<ScheduleResponseDto>;
  /**
   * Everyone scheduled counts as present once the event has happened. A leader
   * only steps in to record the exception.
   */
  markNoShow(id: string, user: JwtUser): Promise<ScheduleResponseDto>;
  /** Undoes a no-show recorded by mistake. */
  markAttended(id: string, user: JwtUser): Promise<ScheduleResponseDto>;
  update(
    id: string,
    updateData: UpdateScheduleDto,
    user: JwtUser,
  ): Promise<ScheduleResponseDto>;
  remove(id: string, user: JwtUser): Promise<void>;
  getStatistics(eventId: string): Promise<ScheduleStatistics>;
}
