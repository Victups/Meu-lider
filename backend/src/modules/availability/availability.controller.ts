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
import { JwtAuthGuard } from '../../common/guards';
import type { AuthenticatedRequest, MessageResponse } from '../../common/interfaces';
import { AvailabilityService } from './availability.service';
import { AvailabilityResponseDto } from './dtos/availability-response.dto';
import { CreateAvailabilityDto } from './dtos/create-availability.dto';
import { SetWeekdaysDto } from './dtos/set-weekdays.dto';
import { WeekdayAvailabilityResponseDto } from './dtos/weekday-availability-response.dto';
import { UpdateAvailabilityDto } from './dtos/update-availability.dto';

@Controller('members/:memberId/availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('weekdays')
  async getWeekdays(
    @Param('memberId') memberId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<WeekdayAvailabilityResponseDto[]> {
    await this.availabilityService.assertCanManage(memberId, req.user);
    return this.availabilityService.getWeekdays(memberId);
  }

  @Put('weekdays')
  async setWeekdays(
    @Param('memberId') memberId: string,
    @Body() body: SetWeekdaysDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<WeekdayAvailabilityResponseDto[]> {
    await this.availabilityService.assertCanManage(memberId, req.user);
    return this.availabilityService.setWeekdays(memberId, body.weekdays);
  }

  @Get()
  async findByMember(
    @Param('memberId') memberId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AvailabilityResponseDto[]> {
    await this.availabilityService.assertCanManage(memberId, req.user);
    return this.availabilityService.findByMember(memberId);
  }

  @Post()
  async create(
    @Param('memberId') memberId: string,
    @Body() createAvailabilityDto: CreateAvailabilityDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AvailabilityResponseDto> {
    await this.availabilityService.assertCanManage(memberId, req.user);
    createAvailabilityDto.memberId = memberId;
    return this.availabilityService.create(createAvailabilityDto);
  }

  @Get(':availabilityId')
  async findOne(
    @Param('memberId') memberId: string,
    @Param('availabilityId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AvailabilityResponseDto> {
    await this.availabilityService.assertCanManage(memberId, req.user);
    return this.availabilityService.findOne(id, memberId);
  }

  @Put(':availabilityId')
  async update(
    @Param('memberId') memberId: string,
    @Param('availabilityId') id: string,
    @Body() updateData: UpdateAvailabilityDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AvailabilityResponseDto> {
    await this.availabilityService.assertCanManage(memberId, req.user);
    return this.availabilityService.update(id, updateData, memberId);
  }

  @Delete(':availabilityId')
  async remove(
    @Param('memberId') memberId: string,
    @Param('availabilityId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    await this.availabilityService.assertCanManage(memberId, req.user);
    await this.availabilityService.remove(id, memberId);
    return { message: 'Disponibilidade removida' };
  }
}
