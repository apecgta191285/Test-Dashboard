#!/bin/bash

# Interfaces
cat > src/modules/integrations/google-ads/interfaces/google-ads-config.interface.ts << 'EOF'
export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  refreshToken?: string;
  customerId?: string;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  budget: number;
  startDate: string;
  endDate?: string;
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
}
EOF

# DTOs
cat > src/modules/integrations/google-ads/dto/connect-google-ads.dto.ts << 'EOF'
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ConnectGoogleAdsDto {
  @ApiProperty({ example: 'your-client-id' })
  @IsString()
  clientId: string;

  @ApiProperty({ example: 'your-client-secret' })
  @IsString()
  clientSecret: string;

  @ApiProperty({ example: 'your-developer-token' })
  @IsString()
  developerToken: string;

  @ApiProperty({ example: 'your-refresh-token', required: false })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiProperty({ example: '1234567890', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;
}
EOF

cat > src/modules/integrations/google-ads/dto/sync-campaigns.dto.ts << 'EOF'
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
EOF

# Google Ads Auth Service
cat > src/modules/integrations/google-ads/services/google-ads-auth.service.ts << 'EOF'
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class GoogleAdsAuthService {
  private oauth2Client;

  constructor(private readonly config: ConfigService) {
    this.oauth2Client = new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      this.config.get('GOOGLE_REDIRECT_URI') || 'http://localhost:3000/api/v1/integrations/google-ads/callback',
    );
  }

  getAuthUrl(): string {
    const scopes = ['https://www.googleapis.com/auth/adwords'];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  async getTokensFromCode(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      throw new BadRequestException('Invalid authorization code');
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      throw new BadRequestException('Failed to refresh access token');
    }
  }
}
EOF

# Google Ads Client Service
cat > src/modules/integrations/google-ads/services/google-ads-client.service.ts << 'EOF'
import { Injectable, Logger } from '@nestjs/common';
import { GoogleAdsConfig, GoogleAdsCampaign, GoogleAdsMetrics } from '../interfaces/google-ads-config.interface';

@Injectable()
export class GoogleAdsClientService {
  private readonly logger = new Logger(GoogleAdsClientService.name);

  async getCampaigns(config: GoogleAdsConfig): Promise<GoogleAdsCampaign[]> {
    // Simulate API call - In production, use google-ads-api library
    this.logger.log('Fetching campaigns from Google Ads API');
    
    // Mock data for demonstration
    return [
      {
        id: 'camp_001',
        name: 'Summer Sale 2024',
        status: 'ACTIVE',
        budget: 5000,
        startDate: '2024-06-01',
        endDate: '2024-08-31',
      },
      {
        id: 'camp_002',
        name: 'Brand Awareness',
        status: 'ACTIVE',
        budget: 3000,
        startDate: '2024-01-01',
      },
    ];
  }

  async getCampaignMetrics(
    config: GoogleAdsConfig,
    campaignId: string,
    startDate: string,
    endDate: string,
  ): Promise<GoogleAdsMetrics> {
    // Simulate API call
    this.logger.log(`Fetching metrics for campaign ${campaignId}`);
    
    // Mock data
    return {
      impressions: 150000,
      clicks: 5000,
      cost: 2500,
      conversions: 250,
      conversionValue: 12500,
    };
  }

  async testConnection(config: GoogleAdsConfig): Promise<boolean> {
    try {
      this.logger.log('Testing Google Ads API connection');
      // In production, make actual API call to verify credentials
      return true;
    } catch (error) {
      this.logger.error('Connection test failed', error);
      return false;
    }
  }
}
EOF

# Google Ads Integration Service
cat > src/modules/integrations/google-ads/services/google-ads-integration.service.ts << 'EOF'
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GoogleAdsAuthService } from './google-ads-auth.service';
import { GoogleAdsClientService } from './google-ads-client.service';
import { ConnectGoogleAdsDto, SyncCampaignsDto } from '../dto';

@Injectable()
export class GoogleAdsIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: GoogleAdsAuthService,
    private readonly clientService: GoogleAdsClientService,
  ) {}

  async connect(tenantId: string, dto: ConnectGoogleAdsDto) {
    // Save API connection
    const connection = await this.prisma.aPIConnection.create({
      data: {
        tenantId,
        platform: 'GOOGLE_ADS',
        credentials: {
          clientId: dto.clientId,
          clientSecret: dto.clientSecret,
          developerToken: dto.developerToken,
          refreshToken: dto.refreshToken,
          customerId: dto.customerId,
        },
        isActive: true,
      },
    });

    // Test connection
    const isValid = await this.clientService.testConnection({
      clientId: dto.clientId,
      clientSecret: dto.clientSecret,
      developerToken: dto.developerToken,
      refreshToken: dto.refreshToken,
      customerId: dto.customerId,
    });

    if (!isValid) {
      await this.prisma.aPIConnection.update({
        where: { id: connection.id },
        data: { isActive: false },
      });
    }

    return {
      ...connection,
      connectionValid: isValid,
    };
  }

  async syncCampaigns(tenantId: string, dto: SyncCampaignsDto) {
    // Get API connection
    const connection = await this.prisma.aPIConnection.findFirst({
      where: {
        tenantId,
        platform: 'GOOGLE_ADS',
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Google Ads connection not found');
    }

    const credentials = connection.credentials as any;

    // Fetch campaigns from Google Ads
    const campaigns = await this.clientService.getCampaigns({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      developerToken: credentials.developerToken,
      refreshToken: credentials.refreshToken,
      customerId: dto.customerId || credentials.customerId,
    });

    // Save campaigns to database
    const savedCampaigns = [];
    for (const campaign of campaigns) {
      const saved = await this.prisma.campaign.upsert({
        where: {
          tenantId_externalId: {
            tenantId,
            externalId: campaign.id,
          },
        },
        update: {
          name: campaign.name,
          platform: 'GOOGLE_ADS',
          status: campaign.status,
          budget: campaign.budget,
          startDate: new Date(campaign.startDate),
          endDate: campaign.endDate ? new Date(campaign.endDate) : null,
        },
        create: {
          tenantId,
          name: campaign.name,
          platform: 'GOOGLE_ADS',
          status: campaign.status,
          budget: campaign.budget,
          startDate: new Date(campaign.startDate),
          endDate: campaign.endDate ? new Date(campaign.endDate) : null,
          externalId: campaign.id,
        },
      });

      // Fetch and save metrics
      const metrics = await this.clientService.getCampaignMetrics(
        {
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          developerToken: credentials.developerToken,
          refreshToken: credentials.refreshToken,
          customerId: dto.customerId || credentials.customerId,
        },
        campaign.id,
        dto.startDate,
        dto.endDate,
      );

      await this.prisma.metric.create({
        data: {
          campaignId: saved.id,
          date: new Date(),
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          spend: metrics.cost,
          revenue: metrics.conversionValue,
          conversions: metrics.conversions,
          ctr: (metrics.clicks / metrics.impressions) * 100,
          cpc: metrics.cost / metrics.clicks,
          roas: metrics.conversionValue / metrics.cost,
        },
      });

      savedCampaigns.push(saved);
    }

    return {
      synced: savedCampaigns.length,
      campaigns: savedCampaigns,
    };
  }

  async getAuthUrl() {
    return {
      authUrl: this.authService.getAuthUrl(),
    };
  }

  async handleCallback(code: string) {
    const tokens = await this.authService.getTokensFromCode(code);
    return tokens;
  }
}
EOF

# Controller
cat > src/modules/integrations/google-ads/google-ads.controller.ts << 'EOF'
import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAdsIntegrationService } from './services/google-ads-integration.service';
import { ConnectGoogleAdsDto, SyncCampaignsDto } from './dto';

@ApiTags('Google Ads Integration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('integrations/google-ads')
export class GoogleAdsController {
  constructor(
    private readonly googleAdsService: GoogleAdsIntegrationService,
  ) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get Google OAuth2 authorization URL' })
  getAuthUrl() {
    return this.googleAdsService.getAuthUrl();
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle OAuth2 callback' })
  handleCallback(@Query('code') code: string) {
    return this.googleAdsService.handleCallback(code);
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect Google Ads account' })
  connect(@Body() dto: ConnectGoogleAdsDto) {
    // In real app, get tenantId from current user
    const tenantId = 'demo-tenant-id';
    return this.googleAdsService.connect(tenantId, dto);
  }

  @Post('sync-campaigns')
  @ApiOperation({ summary: 'Sync campaigns from Google Ads' })
  syncCampaigns(@Body() dto: SyncCampaignsDto) {
    // In real app, get tenantId from current user
    const tenantId = 'demo-tenant-id';
    return this.googleAdsService.syncCampaigns(tenantId, dto);
  }
}
EOF

# Module
cat > src/modules/integrations/google-ads/google-ads.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { GoogleAdsController } from './google-ads.controller';
import { GoogleAdsIntegrationService } from './services/google-ads-integration.service';
import { GoogleAdsAuthService } from './services/google-ads-auth.service';
import { GoogleAdsClientService } from './services/google-ads-client.service';

@Module({
  controllers: [GoogleAdsController],
  providers: [
    GoogleAdsIntegrationService,
    GoogleAdsAuthService,
    GoogleAdsClientService,
  ],
  exports: [GoogleAdsIntegrationService],
})
export class GoogleAdsModule {}
EOF

echo "✅ Google Ads Integration files created"
