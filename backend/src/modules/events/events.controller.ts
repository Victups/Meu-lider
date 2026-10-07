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
import { MANAGER_ROLES } from '../../common/constants';
import { Roles } from '../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { AuthenticatedRequest } from '../../common/interfaces';
import { CreateEventDto } from './dtos/create-event.dto';
import { EventResponseDto } from './dtos/event-response.dto';
import { LinkTeamDto } from './dtos/link-team.dto';
import { UpdateEventDto } from './dtos/update-event.dto';
import { EventsService } from './events.service';

@Controller('churches/:churchId/events')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
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

  @Roles(...MANAGER_ROLES)
  @Post()
  create(
    @Param('churchId') churchId: string,
    @Body() createEventDto: CreateEventDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<EventResponseDto> {
    createEventDto.churchId = churchId;
    return this.eventsService.create(createEventDto, req.user);
  }

  @Get(':eventId')
  findOne(@Param('eventId') id: string): Promise<EventResponseDto> {
    return this.eventsService.findOne(id);
  }

  @Roles(...MANAGER_ROLES)
  @Put(':eventId')
  update(
    @Param('eventId') id: string,
    @Body() updateData: UpdateEventDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(id, updateData, req.user);
  }

  /** A leader attaching their own team to the event; the roster builds itself. */
  @Roles(...MANAGER_ROLES)
  @Post(':eventId/teams/:teamId')
  linkTeam(
    @Param('churchId') churchId: string,
    @Param('eventId') eventId: string,
    @Param('teamId') teamId: string,
    @Body() body: LinkTeamDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<EventResponseDto> {
    return this.eventsService.linkTeam(
      churchId,
      eventId,
      teamId,
      body.applyToSeries === true,
      req.user,
    );
  }

  @Roles(...MANAGER_ROLES)
  @Delete(':eventId/teams/:teamId')
  unlinkTeam(
    @Param('churchId') churchId: string,
    @Param('eventId') eventId: string,
    @Param('teamId') teamId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<EventResponseDto> {
    return this.eventsService.unlinkTeam(churchId, eventId, teamId, req.user);
  }

  @Roles(...MANAGER_ROLES)
  @Delete(':eventId')
  remove(@Param('eventId') id: string): Promise<EventResponseDto> {
    return this.eventsService.remove(id);
  }
}
