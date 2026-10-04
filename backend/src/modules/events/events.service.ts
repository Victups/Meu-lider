import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import { ResourceNotFoundException } from '../../common/exceptions';
import { CreateEventDto } from './dtos/create-event.dto';
import { EventResponseDto } from './dtos/event-response.dto';
import { UpdateEventDto } from './dtos/update-event.dto';
import { Event } from './entities/event.entity';
import { EventTeam } from './entities/event-team.entity';
import type { IEventsService } from './interfaces/events-service.interface';
import { toEventResponse, toEventResponseList } from './mappers/event.mapper';

@Injectable()
export class EventsService implements IEventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(EventTeam)
    private readonly eventTeamsRepository: Repository<EventTeam>,
  ) {}

  /** Replaces the event's team list wholesale; undefined leaves it untouched. */
  private async syncTeams(eventId: string, teamIds?: string[]): Promise<void> {
    if (!teamIds) return;

    await this.eventTeamsRepository.delete({ eventId });
    if (teamIds.length === 0) return;

    await this.eventTeamsRepository.save(
      teamIds.map((teamId) => this.eventTeamsRepository.create({ eventId, teamId })),
    );
  }

  async create(createEventDto: CreateEventDto, userId: string): Promise<EventResponseDto> {
    const { teamIds, ...eventData } = createEventDto;

    const event = this.eventsRepository.create({ ...eventData, createdById: userId });
    const saved = await this.eventsRepository.save(event);
    await this.syncTeams(saved.id, teamIds);

    return toEventResponse(await this.findEventEntity(saved.id));
  }

  async findOne(id: string): Promise<EventResponseDto> {
    return toEventResponse(await this.findEventEntity(id));
  }

  async findByChurch(
    churchId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<EventResponseDto[]> {
    let query = this.eventsRepository
      .createQueryBuilder('event')
      .where('event.churchId = :churchId', { churchId })
      .andWhere('event.active = :active', { active: true });

    if (startDate) {
      query = query.andWhere('event.eventDate >= :startDate', { startDate });
    }

    if (endDate) {
      query = query.andWhere('event.eventDate <= :endDate', { endDate });
    }

    const events = await query.orderBy('event.eventDate', 'ASC').getMany();
    return toEventResponseList(events);
  }

  async update(id: string, updateData: UpdateEventDto): Promise<EventResponseDto> {
    const { teamIds, ...eventData } = updateData;
    const event = await this.findEventEntity(id);

    Object.assign(event, eventData);
    await this.eventsRepository.save(event);
    await this.syncTeams(id, teamIds);

    return toEventResponse(await this.findEventEntity(id));
  }

  async remove(id: string): Promise<EventResponseDto> {
    const event = await this.findEventEntity(id);
    event.active = false;

    return toEventResponse(await this.eventsRepository.save(event));
  }

  private async findEventEntity(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: { schedules: true, teams: { team: true } },
    });

    if (!event) {
      throw new ResourceNotFoundException(ResourceType.EVENT, id);
    }

    return event;
  }
}
