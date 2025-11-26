import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoogleAdsOAuthService } from './google-ads-oauth.service';

@ApiTags('integrations/google-ads')
@Controller('integrations/google-ads')
export class GoogleAdsOAuthController {
  constructor(private readonly googleAdsOAuthService: GoogleAdsOAuthService) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Ads OAuth authorization URL' })
  async getAuthUrl(@Req() req: any) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const authUrl = await this.googleAdsOAuthService.generateAuthUrl(
      userId,
      tenantId,
    );

    return {
      authUrl,
      message: 'Open this URL in a browser to authorize Google Ads access',
    };
  }

  @Get('callback')
  @ApiOperation({ summary: 'OAuth callback endpoint' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        return res.redirect(
          `http://localhost:3001/integrations?error=missing_code`,
        );
      }

      // Exchange code for tokens and save
      const result = await this.googleAdsOAuthService.handleCallback(
        code,
        state,
      );

      // Redirect to frontend with success
      return res.redirect(
        `http://localhost:3001/integrations?success=true&account_id=${result.accountId}`,
      );
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.redirect(
        `http://localhost:3001/integrations?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get connected Google Ads accounts' })
  async getConnectedAccounts(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.googleAdsOAuthService.getConnectedAccounts(tenantId);
  }
}
