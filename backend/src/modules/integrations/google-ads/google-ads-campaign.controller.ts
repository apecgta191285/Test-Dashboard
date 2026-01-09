import { Controller, Get, Post, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoogleAdsCampaignService } from './google-ads-campaign.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UnifiedSyncService } from '../../sync/unified-sync.service';
import { PlatformType } from '../../../common/enums/platform-type.enum';

@ApiTags('integrations/google-ads')
@Controller('integrations/google-ads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleAdsCampaignController {
    constructor(
        private readonly campaignService: GoogleAdsCampaignService,
        private readonly prisma: PrismaService,
        private readonly unifiedSyncService: UnifiedSyncService,
    ) { }

    /**
     * Validate that the account belongs to the requesting tenant
     */
    private async validateAccountOwnership(accountId: string, tenantId: string): Promise<void> {
        const account = await this.prisma.googleAdsAccount.findFirst({
            where: {
                id: accountId,
                tenantId: tenantId,
            },
        });

        if (!account) {
            throw new ForbiddenException('You do not have access to this Google Ads account');
        }
    }

    @Get(':accountId/campaigns/fetch')
    @ApiOperation({ summary: 'Fetch campaigns from Google Ads (without saving)' })
    @ApiParam({ name: 'accountId', description: 'Google Ads Account ID' })
    async fetchCampaigns(
        @Param('accountId') accountId: string,
        @Req() req: any,
    ) {
        await this.validateAccountOwnership(accountId, req.user.tenantId);
        return this.campaignService.fetchCampaigns(accountId);
    }

    @Post(':accountId/campaigns/sync')
    @ApiOperation({ summary: 'Sync campaigns from Google Ads to database' })
    @ApiParam({ name: 'accountId', description: 'Google Ads Account ID' })
    async syncCampaigns(
        @Param('accountId') accountId: string,
        @Req() req: any,
    ) {
        await this.validateAccountOwnership(accountId, req.user.tenantId);
        // Use UnifiedSyncService
        await this.unifiedSyncService.syncAccount(PlatformType.GOOGLE_ADS, accountId, req.user.tenantId);
        return { success: true, message: 'Sync started' };
    }

    @Post(':accountId/campaigns/:campaignId/sync-metrics')
    @ApiOperation({ summary: 'Sync metrics for a specific campaign' })
    @ApiParam({ name: 'accountId', description: 'Google Ads Account ID' })
    @ApiParam({ name: 'campaignId', description: 'Campaign ID (internal database ID)' })
    @ApiQuery({ name: 'days', required: false, description: 'Number of days to sync (default: 30)', type: Number })
    async syncCampaignMetrics(
        @Param('accountId') accountId: string,
        @Param('campaignId') campaignId: string,
        @Query('days') days: string,
        @Req() req: any,
    ) {
        await this.validateAccountOwnership(accountId, req.user.tenantId);
        // Unified Sync handles everything at account level.
        // We trigger a full account sync which includes metrics.
        await this.unifiedSyncService.syncAccount(PlatformType.GOOGLE_ADS, accountId, req.user.tenantId);
        return { success: true, message: 'Sync started (Account Level)' };
    }

    @Post(':accountId/campaigns/sync-all-metrics')
    @ApiOperation({ summary: 'Sync metrics for all campaigns in an account' })
    @ApiParam({ name: 'accountId', description: 'Google Ads Account ID' })
    @ApiQuery({ name: 'days', required: false, description: 'Number of days to sync (default: 30)', type: Number })
    async syncAllCampaignMetrics(
        @Param('accountId') accountId: string,
        @Query('days') days: string,
        @Req() req: any,
    ) {
        await this.validateAccountOwnership(accountId, req.user.tenantId);
        // Use UnifiedSyncService
        await this.unifiedSyncService.syncAccount(PlatformType.GOOGLE_ADS, accountId, req.user.tenantId);
        return { success: true, message: 'Sync started' };
    }
}
