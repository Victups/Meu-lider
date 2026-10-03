import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import type { MessageResponse } from '../../common/interfaces';
import { AvailabilityService } from './availability.service';
import { AvailabilityResponseDto } from './dtos/availability-response.dto';
import { CreateAvailabilityDto } from './dtos/create-availability.dto';
import { UpdateAvailabilityDto } from './dtos/update-availability.dto';

@Controller('members/:memberId/availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  findByMember(@Param('memberId') memberId: string): Promise<AvailabilityResponseDto[]> {
    return this.availabilityService.findByMember(memberId);
  }

  @Post()
  create(
    @Param('memberId') memberId: string,
    @Body() createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<AvailabilityResponseDto> {
    createAvailabilityDto.memberId = memberId;
    return this.availabilityService.create(createAvailabilityDto);
  }

  @Get(':availabilityId')
  findOne(@Param('availabilityId') id: string): Promise<AvailabilityResponseDto> {
    return this.availabilityService.findOne(id);
  }

  @Put(':availabilityId')
  update(
    @Param('availabilityId') id: string,
    @Body() updateData: UpdateAvailabilityDto,
  ): Promise<AvailabilityResponseDto> {
    return this.availabilityService.update(id, updateData);
  }

  @Delete(':availabilityId')
  async remove(@Param('availabilityId') id: string): Promise<MessageResponse> {
    await this.availabilityService.remove(id);
    return { message: 'Disponibilidade removida' };
  }
}
