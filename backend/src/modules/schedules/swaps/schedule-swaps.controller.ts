import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { MANAGER_ROLES } from '../../../common/constants';
import { Roles } from '../../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../../common/guards';
import type { AuthenticatedRequest } from '../../../common/interfaces';
import { CreateScheduleSwapDto } from './dtos/create-schedule-swap.dto';
import { ListScheduleSwapsDto } from './dtos/list-schedule-swaps.dto';
import { ResolveScheduleSwapDto } from './dtos/resolve-schedule-swap.dto';
import { ScheduleSwapResponseDto } from './dtos/schedule-swap-response.dto';
import { ScheduleSwapsService } from './schedule-swaps.service';

@Controller('churches/:churchId/swaps')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
export class ScheduleSwapsController {
  constructor(private readonly scheduleSwapsService: ScheduleSwapsService) {}

  /** Open calls by default; pass `status` or `scheduleId` to narrow it down. */
  @Get()
  findByChurch(
    @Param('churchId') churchId: string,
    @Query() filters: ListScheduleSwapsDto,
  ): Promise<ScheduleSwapResponseDto[]> {
    return this.scheduleSwapsService.findByChurch(churchId, filters);
  }

  @Post()
  request(
    @Param('churchId') churchId: string,
    @Body() createDto: CreateScheduleSwapDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleSwapResponseDto> {
    return this.scheduleSwapsService.request(churchId, createDto, req.user);
  }

  @Get(':swapId')
  findOne(
    @Param('churchId') churchId: string,
    @Param('swapId') swapId: string,
  ): Promise<ScheduleSwapResponseDto> {
    return this.scheduleSwapsService.findOne(churchId, swapId);
  }

  /** The logged-in member takes the slot over. */
  @Post(':swapId/accept')
  accept(
    @Param('churchId') churchId: string,
    @Param('swapId') swapId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleSwapResponseDto> {
    return this.scheduleSwapsService.accept(churchId, swapId, req.user);
  }

  @Post(':swapId/decline')
  decline(
    @Param('churchId') churchId: string,
    @Param('swapId') swapId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleSwapResponseDto> {
    return this.scheduleSwapsService.decline(churchId, swapId, req.user);
  }

  @Post(':swapId/cancel')
  cancel(
    @Param('churchId') churchId: string,
    @Param('swapId') swapId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleSwapResponseDto> {
    return this.scheduleSwapsService.cancel(churchId, swapId, req.user);
  }

  /** Leader or admin closes the request onto a member of their choosing. */
  @Roles(...MANAGER_ROLES)
  @Post(':swapId/resolve')
  resolve(
    @Param('churchId') churchId: string,
    @Param('swapId') swapId: string,
    @Body() resolveDto: ResolveScheduleSwapDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleSwapResponseDto> {
    return this.scheduleSwapsService.resolve(churchId, swapId, resolveDto, req.user);
  }
}
