import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional } from 'class-validator';

export class SyncCampaignsDto {
  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-12-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: '1234567890', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;
}

