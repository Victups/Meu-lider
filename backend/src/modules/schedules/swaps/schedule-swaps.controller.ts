import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { MANAGER_ROLES } from '../../../common/constants';
import { Roles } from '../../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../../common/guards';
import type { AuthenticatedRequest } from '../../../common/interfaces';
import { ScheduleResponseDto } from '../dtos/schedule-response.dto';
import { CreateScheduleSwapDto } from './dtos/create-schedule-swap.dto';
import { ListScheduleSwapsDto } from './dtos/list-schedule-swaps.dto';
import { ResolveScheduleSwapDto } from './dtos/resolve-schedule-swap.dto';
import {
  MySwapsDto,
  ScheduleSwapResponseDto,
  SwapCandidateMemberDto,
} from './dtos/schedule-swap-response.dto';
import { SwapCandidatesQueryDto } from './dtos/swap-candidates-query.dto';
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

  /** What the logged-in member has to answer, and what they asked for. */
  @Get('mine')
  findMine(
    @Param('churchId') churchId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MySwapsDto> {
    return this.scheduleSwapsService.findMine(churchId, req.user);
  }

  /** Colleagues' schedules the member could trade days with. */
  @Get('exchange-candidates')
  findExchangeCandidates(
    @Param('churchId') churchId: string,
    @Query() query: SwapCandidatesQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ScheduleResponseDto[]> {
    return this.scheduleSwapsService.findExchangeCandidates(churchId, query.scheduleId, req.user);
  }

  /** Team members who could take the slot over outright. */
  @Get('handover-candidates')
  findHandoverCandidates(
    @Param('churchId') churchId: string,
    @Query() query: SwapCandidatesQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SwapCandidateMemberDto[]> {
    return this.scheduleSwapsService.findHandoverCandidates(churchId, query.scheduleId, req.user);
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
