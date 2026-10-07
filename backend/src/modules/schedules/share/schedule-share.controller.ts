import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChurchGuard, JwtAuthGuard } from '../../../common/guards';
import { ShareTextDto, ShareTextQueryDto } from './dtos/share-text.dto';
import { ScheduleShareService } from './schedule-share.service';

@Controller('churches/:churchId/schedule-share')
@UseGuards(JwtAuthGuard, ChurchGuard)
export class ScheduleShareController {
  constructor(private readonly scheduleShareService: ScheduleShareService) {}

  /** The month's roster as WhatsApp-ready text. Everyone in the church may read it. */
  @Get()
  monthText(
    @Param('churchId') churchId: string,
    @Query() query: ShareTextQueryDto,
  ): Promise<ShareTextDto> {
    return this.scheduleShareService.buildMonthText(churchId, query.month, query.teamId);
  }
}
