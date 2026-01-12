import { IsString, IsEnum, IsOptional, IsNotEmpty, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';

export class CreateNotificationDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ example: 'ALERT' })
    @IsString()
    @IsNotEmpty()
    type: string;  // ALERT, REPORT_READY, SYNC_COMPLETE, SYSTEM

    @ApiProperty({ example: 'Alert: Low ROAS Detected' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'Campaign XYZ has ROAS below threshold' })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiPropertyOptional({ enum: NotificationChannel, default: 'IN_APP' })
    @IsEnum(NotificationChannel)
    @IsOptional()
    channel?: NotificationChannel;

    @ApiPropertyOptional({ example: 'NORMAL' })
    @IsString()
    @IsOptional()
    priority?: string;

    @ApiPropertyOptional({ example: { actionUrl: '/alerts/123', actionText: 'View' } })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    alertId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    campaignId?: string;
}

export class MarkAsReadDto {
    @ApiProperty()
    @IsBoolean()
    isRead: boolean;
}
