import type { CreateEventDto } from '../dtos/create-event.dto';
import type { EventResponseDto } from '../dtos/event-response.dto';
import type { UpdateEventDto } from '../dtos/update-event.dto';

export interface IEventsService {
  create(createEventDto: CreateEventDto, userId: string): Promise<EventResponseDto>;
  findOne(id: string): Promise<EventResponseDto>;
  findByChurch(churchId: string, startDate?: Date, endDate?: Date): Promise<EventResponseDto[]>;
  update(id: string, updateData: UpdateEventDto): Promise<EventResponseDto>;
  remove(id: string): Promise<EventResponseDto>;
}
