import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { CampaignStatus, AdPlatform } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer Sale 2024' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: AdPlatform })
  @IsEnum(AdPlatform)
  platform: AdPlatform;

  @ApiProperty({ enum: CampaignStatus, example: 'ACTIVE' })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiProperty({ example: '2024-01-01', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: 'google_ads_campaign_123', required: false })
  @IsString()
  @IsOptional()
  externalId?: string;
}
