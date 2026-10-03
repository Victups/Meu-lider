import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import { ResourceNotFoundException } from '../../common/exceptions';
import { CreateEventDto } from './dtos/create-event.dto';
import { EventResponseDto } from './dtos/event-response.dto';
import { UpdateEventDto } from './dtos/update-event.dto';
import { Event } from './entities/event.entity';
import type { IEventsService } from './interfaces/events-service.interface';
import { toEventResponse, toEventResponseList } from './mappers/event.mapper';

@Injectable()
export class EventsService implements IEventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto, userId: string): Promise<EventResponseDto> {
    const event = this.eventsRepository.create({ ...createEventDto, createdById: userId });
    return toEventResponse(await this.eventsRepository.save(event));
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
    const event = await this.findEventEntity(id);

    Object.assign(event, updateData);
    return toEventResponse(await this.eventsRepository.save(event));
  }

  async remove(id: string): Promise<EventResponseDto> {
    const event = await this.findEventEntity(id);
    event.active = false;

    return toEventResponse(await this.eventsRepository.save(event));
  }

  private async findEventEntity(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: { schedules: true },
    });

    if (!event) {
      throw new ResourceNotFoundException(ResourceType.EVENT, id);
    }

    return event;
  }
}
