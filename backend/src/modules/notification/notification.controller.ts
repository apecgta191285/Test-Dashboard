import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateNotificationDto, NotificationQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get notifications for current user' })
    async findAll(@Req() req: any, @Query() query: NotificationQueryDto) {
        return this.notificationService.findAll(req.user.sub, query);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notification count' })
    async getUnreadCount(@Req() req: any) {
        const count = await this.notificationService.getUnreadCount(req.user.sub);
        return { unreadCount: count };
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    async markAsRead(@Param('id') id: string, @Req() req: any) {
        return this.notificationService.markAsRead(id, req.user.sub);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    async markAllAsRead(@Req() req: any) {
        return this.notificationService.markAllAsRead(req.user.sub);
    }

    @Patch(':id/dismiss')
    @ApiOperation({ summary: 'Dismiss notification' })
    async dismiss(@Param('id') id: string, @Req() req: any) {
        return this.notificationService.dismiss(id, req.user.sub);
    }
}
