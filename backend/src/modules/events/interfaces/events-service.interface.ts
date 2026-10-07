import type { JwtUser } from '../../../common/interfaces';
import type { CreateEventDto } from '../dtos/create-event.dto';
import type { EventResponseDto } from '../dtos/event-response.dto';
import type { UpdateEventDto } from '../dtos/update-event.dto';

export interface IEventsService {
  create(createEventDto: CreateEventDto, user: JwtUser): Promise<EventResponseDto>;
  findOne(id: string): Promise<EventResponseDto>;
  findByChurch(churchId: string, startDate?: Date, endDate?: Date): Promise<EventResponseDto[]>;
  update(id: string, updateData: UpdateEventDto, user: JwtUser): Promise<EventResponseDto>;
  /** Attach a team the caller leads and build its roster; optionally for the whole series. */
  linkTeam(
    churchId: string,
    eventId: string,
    teamId: string,
    applyToSeries: boolean,
    user: JwtUser,
  ): Promise<EventResponseDto>;
  unlinkTeam(
    churchId: string,
    eventId: string,
    teamId: string,
    user: JwtUser,
  ): Promise<EventResponseDto>;
  remove(id: string): Promise<EventResponseDto>;
}
