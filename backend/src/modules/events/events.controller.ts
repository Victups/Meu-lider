import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ChurchGuard, JwtAuthGuard } from '../../common/guards';
import type { AuthenticatedRequest } from '../../common/interfaces';
import { CreateEventDto } from './dtos/create-event.dto';
import { EventResponseDto } from './dtos/event-response.dto';
import { UpdateEventDto } from './dtos/update-event.dto';
import { EventsService } from './events.service';

@Controller('churches/:churchId/events')
@UseGuards(JwtAuthGuard, ChurchGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findByChurch(
    @Param('churchId') churchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<EventResponseDto[]> {
    return this.eventsService.findByChurch(
      churchId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post()
  create(
    @Param('churchId') churchId: string,
    @Body() createEventDto: CreateEventDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<EventResponseDto> {
    createEventDto.churchId = churchId;
    return this.eventsService.create(createEventDto, req.user.id);
  }

  @Get(':eventId')
  findOne(@Param('eventId') id: string): Promise<EventResponseDto> {
    return this.eventsService.findOne(id);
  }

  @Put(':eventId')
  update(
    @Param('eventId') id: string,
    @Body() updateData: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(id, updateData);
  }

  @Delete(':eventId')
  remove(@Param('eventId') id: string): Promise<EventResponseDto> {
    return this.eventsService.remove(id);
  }
}
