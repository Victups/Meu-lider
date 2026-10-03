import { toScheduleSummaryList } from '../../schedules/mappers/schedule.mapper';
import { EventResponseDto } from '../dtos/event-response.dto';
import { Event } from '../entities/event.entity';

export function toEventResponse(event: Event): EventResponseDto {
  return {
    id: event.id,
    churchId: event.churchId,
    name: event.name,
    description: event.description ?? null,
    eventType: event.eventType,
    eventDate: event.eventDate,
    location: event.location ?? null,
    endDate: event.endDate ?? null,
    active: event.active,
    recurrenceRule: event.recurrenceRule ?? null,
    createdById: event.createdById ?? null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    schedules: event.schedules ? toScheduleSummaryList(event.schedules) : undefined,
  };
}

export function toEventResponseList(events: Event[]): EventResponseDto[] {
  return events.map(toEventResponse);
}

export function toOptionalEventResponse(event?: Event | null): EventResponseDto | undefined {
  return event ? toEventResponse(event) : undefined;
}
