import { Controller, Get, Post, Query, Res, UseGuards, Req } from '@nestjs/common';
import { TikTokAdsOAuthService } from './tiktok-ads-oauth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('TikTok Ads Auth')
@Controller('auth/tiktok')
export class TikTokAdsController {
    constructor(
        private readonly tiktokOAuthService: TikTokAdsOAuthService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Get auth URL or connect directly based on mode
     * - Sandbox mode: Returns sandbox info (use POST /connect-sandbox instead)
     * - Production mode: Returns OAuth URL
     */
    @Get('url')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get TikTok OAuth URL or sandbox mode info' })
    getAuthUrl(@Req() req) {
        const userId = req.user.id;
        const tenantId = req.user.tenantId;

        // Check if sandbox mode
        if (this.tiktokOAuthService.isSandboxMode()) {
            return {
                isSandbox: true,
                message: 'Sandbox mode - use POST /auth/tiktok/connect-sandbox to connect',
                connectEndpoint: '/auth/tiktok/connect-sandbox',
            };
        }

        // Production mode - return OAuth URL
        const url = this.tiktokOAuthService.generateAuthUrl(userId, tenantId);
        return { isSandbox: false, url };
    }

    /**
     * Connect Sandbox account directly (Sandbox mode only)
     * Uses pre-configured access token from environment variables
     */
    @Post('connect-sandbox')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Connect TikTok Sandbox account (Sandbox mode only)' })
    async connectSandbox(@Req() req) {
        const tenantId = req.user.tenantId;
        const result = await this.tiktokOAuthService.connectSandbox(tenantId);
        return result;
    }

    /**
     * OAuth callback (Production mode only)
     */
    @Get('callback')
    @ApiOperation({ summary: 'TikTok OAuth callback (Production mode)' })
    async handleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';

        try {
            await this.tiktokOAuthService.handleCallback(code, state);
            return res.redirect(`${frontendUrl}/integrations?status=success&platform=tiktok`);
        } catch (error) {
            return res.redirect(`${frontendUrl}/integrations?status=error&message=${encodeURIComponent(error.message)}`);
        }
    }
}
