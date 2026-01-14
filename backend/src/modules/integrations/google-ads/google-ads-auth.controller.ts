import { Controller, Get, Post, Query, Req, Res, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoogleAdsOAuthService } from './google-ads-oauth.service';

@ApiTags('auth/google/ads')
@Controller('auth/google/ads')
export class GoogleAdsAuthController {
    // ✅ Inject ConfigService for environment-based URLs
    private readonly frontendUrl: string;

    constructor(
        private readonly oauthService: GoogleAdsOAuthService,
        private readonly configService: ConfigService,
    ) {
        // ✅ Use environment variable with fallback
        // Use FRONTEND_URL from environment, fallback to Vite default port
        this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    }

    @Get('url')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get Google Ads OAuth authorization URL' })
    async getAuthUrl(@Req() req: any) {
        const userId = req.user.id;
        const tenantId = req.user.tenantId;

        const authUrl = await this.oauthService.generateAuthUrl(
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
                // ✅ Use dynamic frontend URL
                return res.redirect(
                    `${this.frontendUrl}/integrations?error=missing_code`,
                );
            }

            // Exchange code for tokens and get account list
            const result = await this.oauthService.handleCallback(
                code,
                state,
            );

            return res.redirect(
                `${this.frontendUrl}/integrations?status=${result.status}&tempToken=${result.tempToken}&platform=ads`,
            );
        } catch (error) {
            console.error('OAuth callback error:', error);
            return res.redirect(
                `${this.frontendUrl}/integrations?error=${encodeURIComponent(error.message)}`,
            );
        }
    }

    @Get('temp-accounts')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get temporary accounts list for selection' })
    async getTempAccounts(@Query('tempToken') tempToken: string) {
        if (!tempToken) {
            throw new BadRequestException('Missing tempToken');
        }
        return this.oauthService.getTempAccounts(tempToken);
    }

    @Post('complete')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Complete Google Ads connection by selecting an account' })
    @ApiBody({ schema: { type: 'object', properties: { tempToken: { type: 'string' }, customerId: { type: 'string' } } } })
    async completeConnection(
        @Req() req: any,
        @Body('tempToken') tempToken: string,
        @Body('customerId') customerId: string,
    ) {
        const tenantId = req.user.tenantId;

        if (!tempToken || !customerId) {
            throw new BadRequestException('Missing tempToken or customerId');
        }

        return this.oauthService.completeConnection(tempToken, customerId, tenantId);
    }

    @Get('accounts')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get connected Google Ads accounts' })
    async getConnectedAccounts(@Req() req: any) {
        const tenantId = req.user.tenantId;
        return this.oauthService.getConnectedAccounts(tenantId);
    }
}
