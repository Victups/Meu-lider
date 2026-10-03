import type { JwtUser } from '../../../common/interfaces';
import type { CreateScheduleDto } from '../dtos/create-schedule.dto';
import type { ScheduleResponseDto } from '../dtos/schedule-response.dto';
import type { UpdateScheduleDto } from '../dtos/update-schedule.dto';
import type { ScheduleStatistics } from './schedule-statistics.interface';

export interface ISchedulesService {
  create(createScheduleDto: CreateScheduleDto): Promise<ScheduleResponseDto>;
  findOne(id: string): Promise<ScheduleResponseDto>;
  findByEvent(eventId: string): Promise<ScheduleResponseDto[]>;
  findByMember(memberId: string): Promise<ScheduleResponseDto[]>;
  confirm(id: string, user: JwtUser): Promise<ScheduleResponseDto>;
  decline(id: string): Promise<ScheduleResponseDto>;
  update(id: string, updateData: UpdateScheduleDto): Promise<ScheduleResponseDto>;
  remove(id: string): Promise<void>;
  getStatistics(eventId: string): Promise<ScheduleStatistics>;
}
