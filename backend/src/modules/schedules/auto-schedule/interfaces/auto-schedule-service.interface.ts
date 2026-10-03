import type { JwtUser } from '../../../../common/interfaces';
import type { AutoScheduleResultDto } from '../dtos/auto-schedule-result.dto';
import type { GenerateScheduleDto } from '../dtos/generate-schedule.dto';

export interface IAutoScheduleService {
  generateForEvent(
    churchId: string,
    eventId: string,
    options: GenerateScheduleDto,
    user: JwtUser,
  ): Promise<AutoScheduleResultDto>;

  generateForEvents(
    churchId: string,
    eventIds: string[],
    options: GenerateScheduleDto,
    user: JwtUser,
  ): Promise<AutoScheduleResultDto[]>;
}
