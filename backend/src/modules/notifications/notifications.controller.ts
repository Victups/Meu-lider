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
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushNotificationService,
  ) {}

  @Post('register-token')
  async registerToken(
    @Request() req: AuthenticatedRequest,
    @Body('token') token: string,
  ): Promise<MessageResponse> {
    await this.pushService.registerToken(req.user.id, token);
    return { message: 'Token registrado' };
  }

  @Post('remove-token')
  async removeToken(@Request() req: AuthenticatedRequest): Promise<MessageResponse> {
    await this.pushService.removeToken(req.user.id);
    return { message: 'Token removido' };
  }

  @Get()
  findByUser(
    @Request() req: AuthenticatedRequest,
    @Query('unread') unread?: string,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.findByUser(req.user.id, unread === 'true');
  }

  @Get(':notificationId')
  findOne(@Param('notificationId') id: string): Promise<NotificationResponseDto> {
    return this.notificationsService.findOne(id);
  }

  @Put(':notificationId/read')
  markAsRead(@Param('notificationId') id: string): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  async markAllAsRead(@Request() req: AuthenticatedRequest): Promise<MessageResponse> {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { message: 'Todas as notificações foram marcadas como lidas' };
  }

  @Delete(':notificationId')
  async remove(@Param('notificationId') id: string): Promise<MessageResponse> {
    await this.notificationsService.remove(id);
    return { message: 'Notificação removida' };
  }
}
