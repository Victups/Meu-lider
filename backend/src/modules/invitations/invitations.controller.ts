import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MANAGER_ROLES } from '../../common/constants';
import { Roles } from '../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { AuthenticatedRequest } from '../../common/interfaces';
import { CreateInvitationDto } from './dtos/create-invitation.dto';
import { InvitationPreviewDto, InvitationResponseDto } from './dtos/invitation-response.dto';
import { InvitationsService } from './invitations.service';

@Controller('churches/:churchId/invitations')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
@Roles(...MANAGER_ROLES)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  create(
    @Param('churchId') churchId: string,
    @Body() dto: CreateInvitationDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.create(churchId, dto, req.user);
  }

  @Get()
  findAll(
    @Param('churchId') churchId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<InvitationResponseDto[]> {
    return this.invitationsService.findByChurch(churchId, req.user);
  }

  @Delete(':invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('churchId') churchId: string,
    @Param('invitationId') invitationId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.invitationsService.revoke(churchId, invitationId, req.user);
  }
}

/** Public on purpose: the person typing the code has no account yet. */
@Controller('invitations')
export class InvitationPreviewController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get(':code')
  preview(@Param('code') code: string): Promise<InvitationPreviewDto> {
    return this.invitationsService.preview(code);
  }
}
