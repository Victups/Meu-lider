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
import { JwtAuthGuard } from '../../common/guards';
import type { AuthenticatedRequest, MessageResponse } from '../../common/interfaces';
import { NotificationResponseDto } from './dtos/notification-response.dto';
import { RegisterPushTokenDto } from './dtos/register-token.dto';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushNotificationService,
  ) {}

  @Get()
  findByUser(
    @Request() req: AuthenticatedRequest,
    @Query('unread') unread?: string,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.findByUser(req.user.id, unread === 'true');
  }

  @Get('unread-count')
  async unreadCount(@Request() req: AuthenticatedRequest): Promise<{ count: number }> {
    return { count: await this.notificationsService.countUnread(req.user.id) };
  }

  @Post('register-token')
  async registerToken(
    @Request() req: AuthenticatedRequest,
    @Body() body: RegisterPushTokenDto,
  ): Promise<MessageResponse> {
    const registered = await this.pushService.registerToken(req.user.id, body.token);
    return { message: registered ? 'Token registrado' : 'Token ignorado: formato inválido' };
  }

  @Post('remove-token')
  async removeToken(@Request() req: AuthenticatedRequest): Promise<MessageResponse> {
    await this.pushService.removeToken(req.user.id);
    return { message: 'Token removido' };
  }

  @Post('read-all')
  async markAllAsRead(@Request() req: AuthenticatedRequest): Promise<MessageResponse> {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { message: 'Todas as notificações foram marcadas como lidas' };
  }

  @Get(':notificationId')
  findOne(
    @Param('notificationId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.findOne(id, req.user.id);
  }

  @Put(':notificationId/read')
  markAsRead(
    @Param('notificationId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Delete(':notificationId')
  async remove(
    @Param('notificationId') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    await this.notificationsService.remove(id, req.user.id);
    return { message: 'Notificação removida' };
  }
}
