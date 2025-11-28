import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoogleAdsCampaignService } from './google-ads-campaign.service';

@ApiTags('Google Ads Campaigns')
@ApiBearerAuth()
@Controller('integrations/google-ads/campaigns')
export class GoogleAdsCampaignController {
  constructor(
    private readonly campaignService: GoogleAdsCampaignService,
  ) { }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all connected Google Ads accounts' })
  async getAccounts(@Request() req) {
    return this.campaignService.getAccounts(req.user.tenantId);
  }

  @Get(':accountId/fetch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fetch campaigns from Google Ads (without saving)' })
  @ApiParam({ name: 'accountId', description: 'Google Ads Account ID' })
  async fetchCampaigns(@Param('accountId') accountId: string) {
    return this.campaignService.fetchCampaigns(accountId);
  }

  @Post(':accountId/sync')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sync campaigns from Google Ads to database' })
  @ApiParam({ name: 'accountId', description: 'Google Ads Account ID' })
  async syncCampaigns(@Param('accountId') accountId: string, @Request() req) {
    return this.campaignService.syncCampaigns(accountId);
  }

  @Post(':accountId/campaigns/:campaignId/sync-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sync metrics for a specific campaign' })
  @ApiParam({ name: 'accountId', description: 'Google Ads Account ID' })
  @ApiParam({ name: 'campaignId', description: 'Campaign ID (internal database ID)' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to sync (default: 30)', type: Number })
  async syncCampaignMetrics(
    @Param('accountId') accountId: string,
    @Param('campaignId') campaignId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.campaignService.syncCampaignMetrics(accountId, campaignId, daysNum);
  }

  @Post(':accountId/sync-all-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sync metrics for all campaigns in an account' })
  @ApiParam({ name: 'accountId', description: 'Google Ads Account ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to sync (default: 30)', type: Number })
  async syncAllCampaignMetrics(
    @Param('accountId') accountId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.campaignService.syncAllCampaignMetrics(accountId, daysNum);
  }
}
