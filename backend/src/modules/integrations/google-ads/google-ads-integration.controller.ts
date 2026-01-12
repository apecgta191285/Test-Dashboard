import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, Delete, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoogleAdsOAuthService } from './google-ads-oauth.service';
import { UnifiedSyncService } from '../../sync/unified-sync.service';
import { AdPlatform } from '@prisma/client';

@ApiTags('integrations/google-ads')
@Controller('integrations/google-ads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleAdsIntegrationController {
  constructor(
    private readonly oauthService: GoogleAdsOAuthService,
    private readonly unifiedSyncService: UnifiedSyncService,
  ) { }

  @Get('status')
  @ApiOperation({ summary: 'Check Google Ads integration status' })
  async getStatus(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const result = await this.oauthService.getConnectedAccounts(tenantId);
    return {
      isConnected: result.accounts.length > 0,
      accounts: result.accounts,
    };
  }

  @Get('auth-url')
  @ApiOperation({ summary: 'Get Google Ads OAuth authorization URL' })
  async getAuthUrl(@Request() req) {
    const url = await this.oauthService.generateAuthUrl(
      req.user.id,
      req.user.tenantId,
    );
    return { url };
  }

  @Post('oauth/callback')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  async handleCallback(
    @Body('code') code: string,
    @Body('state') state: string,
  ) {
    return this.oauthService.handleCallback(code, state);
  }

  @Get('temp-accounts')
  @ApiOperation({ summary: 'Get temporary accounts for selection' })
  async getTempAccounts(@Query('tempToken') tempToken: string) {
    return this.oauthService.getTempAccounts(tempToken);
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect a Google Ads account' })
  async connectAccount(
    @Body('tempToken') tempToken: string,
    @Body('customerId') customerId: string,
    @Request() req,
  ) {
    return this.oauthService.completeConnection(
      tempToken,
      customerId,
      req.user.tenantId,
    );
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get connected accounts' })
  async getConnectedAccounts(@Request() req) {
    return this.oauthService.getConnectedAccounts(req.user.tenantId);
  }

  @Delete()
  @ApiOperation({ summary: 'Disconnect Google Ads integration' })
  async disconnect(@Request() req) {
    return this.oauthService.disconnect(req.user.tenantId);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Trigger manual sync for Google Ads' })
  async triggerSync(@Request() req) {
    // Use UnifiedSyncService to sync all accounts for this platform
    // Note: In a multi-tenant system, syncPlatform might sync ALL tenants if not careful.
    // UnifiedSyncService.syncPlatform currently syncs ALL accounts in DB.
    // We should probably use syncAccount for specific accounts or update UnifiedSyncService to filter by tenant.
    // For now, let's iterate connected accounts and sync them individually using UnifiedSyncService.

    const tenantId = req.user.tenantId;
    const result = await this.oauthService.getConnectedAccounts(tenantId);

    if (result.accounts.length === 0) {
      throw new BadRequestException('No Google Ads account connected');
    }

    const syncResults = [];
    for (const account of result.accounts) {
      await this.unifiedSyncService.syncAccount(AdPlatform.GOOGLE_ADS, account.id, tenantId);
      syncResults.push({ accountId: account.id, status: 'STARTED' });
    }

    return {
      success: true,
      message: 'Sync started for all connected accounts',
      results: syncResults
    };
  }
}
