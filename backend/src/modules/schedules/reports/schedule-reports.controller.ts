import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MANAGER_ROLES, OVERSIGHT_ROLES } from '../../../common/constants';
import { Roles } from '../../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../../common/guards';
import {
  MemberParticipationDto,
  ParticipationQueryDto,
  ScheduleReportsService,
} from './schedule-reports.service';

@Controller('churches/:churchId/reports')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
@Roles(...MANAGER_ROLES, ...OVERSIGHT_ROLES)
export class ScheduleReportsController {
  constructor(private readonly reportsService: ScheduleReportsService) {}

  @Get('participation')
  participation(
    @Param('churchId') churchId: string,
    @Query() query: ParticipationQueryDto,
  ): Promise<MemberParticipationDto[]> {
    return this.reportsService.participation(churchId, query);
  }
}
