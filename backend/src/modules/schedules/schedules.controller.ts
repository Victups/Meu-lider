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
import { ChurchGuard, JwtAuthGuard } from '../../common/guards';
import type { AuthenticatedRequest, MessageResponse } from '../../common/interfaces';
import { CreateScheduleDto } from './dtos/create-schedule.dto';
import { ScheduleResponseDto } from './dtos/schedule-response.dto';
import { UpdateScheduleDto } from './dtos/update-schedule.dto';
import type { ScheduleStatistics } from './interfaces/schedule-statistics.interface';
import { SchedulesService } from './schedules.service';

@Controller('churches/:churchId/schedules')
@UseGuards(JwtAuthGuard, ChurchGuard)
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

  @Post()
  create(@Body() createScheduleDto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    return this.schedulesService.create(createScheduleDto);
  }

  @Get(':scheduleId')
  findOne(@Param('scheduleId') id: string): Promise<ScheduleResponseDto> {
    return this.schedulesService.findOne(id);
  }

  @Put(':scheduleId')
  update(
    @Param('scheduleId') id: string,
    @Body() updateData: UpdateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.update(id, updateData);
  }

  @Post(':scheduleId/confirm')
  confirm(
    @Param('scheduleId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.confirm(id, req.user);
  }

  @Post(':scheduleId/decline')
  decline(@Param('scheduleId') id: string): Promise<ScheduleResponseDto> {
    return this.schedulesService.decline(id);
  }

  @Delete(':scheduleId')
  async remove(@Param('scheduleId') id: string): Promise<MessageResponse> {
    await this.schedulesService.remove(id);
    return { message: 'Escala removida' };
  }
}
