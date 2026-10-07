import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MANAGER_ROLES } from '../../common/constants';
import { Roles } from '../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { AuthenticatedRequest, MessageResponse } from '../../common/interfaces';
import { CreateScheduleDto } from './dtos/create-schedule.dto';
import { LeaderReleaseDto, RequestReleaseDto } from './dtos/request-release.dto';
import { ScheduleResponseDto } from './dtos/schedule-response.dto';
import { UpdateScheduleDto } from './dtos/update-schedule.dto';
import type { ScheduleStatistics } from './interfaces/schedule-statistics.interface';
import { SchedulesService } from './schedules.service';

@Controller('churches/:churchId/schedules')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('events/:eventId')
  findByEvent(@Param('eventId') eventId: string): Promise<ScheduleResponseDto[]> {
    return this.schedulesService.findByEvent(eventId);
  }

  @Get('events/:eventId/statistics')
  getStatistics(@Param('eventId') eventId: string): Promise<ScheduleStatistics> {
    return this.schedulesService.getStatistics(eventId);
  }

  @Get('members/:memberId')
  findByMember(@Param('memberId') memberId: string): Promise<ScheduleResponseDto[]> {
    return this.schedulesService.findByMember(memberId);
  }

  @Roles(...MANAGER_ROLES)
  @Post()
  create(
    @Body() createScheduleDto: CreateScheduleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.create(createScheduleDto, req.user);
  }

  @Get(':scheduleId')
  findOne(@Param('scheduleId') id: string): Promise<ScheduleResponseDto> {
    return this.schedulesService.findOne(id);
  }

  @Roles(...MANAGER_ROLES)
  @Put(':scheduleId')
  update(
    @Param('scheduleId') id: string,
    @Body() updateData: UpdateScheduleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.update(id, updateData, req.user);
  }

  /** Member asking out of their own schedule; a reason is required. */
  @Post(':scheduleId/release-request')
  requestRelease(
    @Param('scheduleId') id: string,
    @Body() body: RequestReleaseDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.requestRelease(id, body.reason, req.user);
  }

  @Roles(...MANAGER_ROLES)
  @Post(':scheduleId/release-request/approve')
  approveRelease(
    @Param('scheduleId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.approveRelease(id, req.user);
  }

  @Roles(...MANAGER_ROLES)
  @Post(':scheduleId/release-request/reject')
  rejectRelease(
    @Param('scheduleId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.rejectRelease(id, req.user);
  }

  /** Leader pulling someone out directly, without a request from the member. */
  @Roles(...MANAGER_ROLES)
  @Post(':scheduleId/release')
  releaseByLeader(
    @Param('scheduleId') id: string,
    @Body() body: LeaderReleaseDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.releaseByLeader(id, body.reason, req.user);
  }

  /** Leader records that someone scheduled did not show up. Everyone else counts as present. */
  @Roles(...MANAGER_ROLES)
  @Post(':scheduleId/no-show')
  markNoShow(
    @Param('scheduleId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.markNoShow(id, req.user);
  }

  @Roles(...MANAGER_ROLES)
  @Post(':scheduleId/attended')
  markAttended(
    @Param('scheduleId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.markAttended(id, req.user);
  }

  @Roles(...MANAGER_ROLES)
  @Delete(':scheduleId')
  async remove(
    @Param('scheduleId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    await this.schedulesService.remove(id, req.user);
    return { message: 'Escala removida' };
  }
}
