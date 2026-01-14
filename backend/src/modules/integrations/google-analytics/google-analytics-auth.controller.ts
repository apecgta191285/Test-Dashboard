import { Controller, Get, Post, Query, Req, Res, UseGuards, Body, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoogleAnalyticsOAuthService } from './google-analytics-oauth.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('auth/google/analytics')
@Controller('auth/google/analytics')
export class GoogleAnalyticsAuthController {
    // ✅ Inject ConfigService for environment-based URLs
    private readonly frontendUrl: string;
    private readonly logger = new Logger(GoogleAnalyticsAuthController.name);

    constructor(
        private readonly oauthService: GoogleAnalyticsOAuthService,
        private readonly configService: ConfigService,
    ) {
        // ✅ Use environment variable with fallback
        // Use FRONTEND_URL from environment, fallback to Vite default port
        this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    }

    @Get('url')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get Google Analytics OAuth authorization URL' })
    async getAuthUrl(@Req() req: any) {
        const userId = req.user.id;
        const tenantId = req.user.tenantId;

        const authUrl = await this.oauthService.generateAuthUrl(
            userId,
            tenantId,
        );

        return {
            authUrl,
            message: 'Open this URL in a browser to authorize Google Analytics access',
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

            // Exchange code for tokens and get property list
            const result = await this.oauthService.handleCallback(
                code,
                state,
            );

            // Redirect to frontend with tempToken and status
            return res.redirect(
                `${this.frontendUrl}/integrations?status=${result.status}&tempToken=${result.tempToken}&platform=ga4`,
            );
        } catch (error) {
            console.error('OAuth callback error:', error);
            return res.redirect(
                `${this.frontendUrl}/integrations?error=${encodeURIComponent(error.message)}`,
            );
        }
    }

    @Get('temp-properties')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get temporary properties list for selection' })
    async getTempProperties(@Query('tempToken') tempToken: string) {
        if (!tempToken) {
            throw new BadRequestException('Missing tempToken');
        }
        return this.oauthService.getTempProperties(tempToken);
    }

    @Post('complete')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Complete GA4 connection by selecting a property' })
    @ApiBody({ schema: { type: 'object', properties: { tempToken: { type: 'string' }, propertyId: { type: 'string' } } } })
    async completeConnection(
        @Req() req: any,
        @Body('tempToken') tempToken: string,
        @Body('propertyId') propertyId: string,
    ) {
        const tenantId = req.user.tenantId;

        if (!tempToken || !propertyId) {
            throw new BadRequestException('Missing tempToken or propertyId');
        }

        return this.oauthService.completeConnection(tempToken, propertyId, tenantId);
    }

    @Get('status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get GA4 connection status' })
    async getStatus(@CurrentUser('tenantId') tenantId: string) {
        this.logger.log(`[GA4 Status] Checking status for tenant ${tenantId}`);
        const status = await this.oauthService.getConnectionStatus(tenantId);
        this.logger.log(`[GA4 Status] Result: ${JSON.stringify(status)}`);
        return status;
    }
}
