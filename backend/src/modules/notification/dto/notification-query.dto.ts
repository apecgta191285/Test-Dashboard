import { IsOptional, IsBoolean, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class NotificationQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    isRead?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    type?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;
}
