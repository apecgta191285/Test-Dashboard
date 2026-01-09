import { Controller, Get, Post, Query, Req, Res, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FacebookAdsOAuthService } from './facebook-ads-oauth.service';

@ApiTags('auth/facebook/ads')
@Controller('auth/facebook/ads')
export class FacebookAdsAuthController {
    private readonly frontendUrl: string;

    constructor(
        private readonly oauthService: FacebookAdsOAuthService,
        private readonly configService: ConfigService,
    ) {
        this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    }

    @Get('url')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get Facebook Ads OAuth authorization URL' })
    async getAuthUrl(@Req() req: any) {
        const userId = req.user.id;
        const tenantId = req.user.tenantId;

        const authUrl = await this.oauthService.generateAuthUrl(
            userId,
            tenantId,
        );

        return {
            authUrl,
            message: 'Open this URL in a browser to authorize Facebook Ads access',
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
                    `${this.frontendUrl}/integrations?error=missing_code`,
                );
            }

            const result = await this.oauthService.handleCallback(
                code,
                state,
            );

            return res.redirect(
                `${this.frontendUrl}/integrations?status=${result.status}&tempToken=${result.tempToken}&platform=facebook`,
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
    @ApiOperation({ summary: 'Complete Facebook Ads connection by selecting an account' })
    @ApiBody({ schema: { type: 'object', properties: { tempToken: { type: 'string' }, accountId: { type: 'string' } } } })
    async completeConnection(
        @Req() req: any,
        @Body('tempToken') tempToken: string,
        @Body('accountId') accountId: string,
    ) {
        const tenantId = req.user.tenantId;

        if (!tempToken || !accountId) {
            throw new BadRequestException('Missing tempToken or accountId');
        }

        return this.oauthService.completeConnection(tempToken, accountId, tenantId);
    }

    @Get('accounts')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get connected Facebook Ads accounts' })
    async getConnectedAccounts(@Req() req: any) {
        const tenantId = req.user.tenantId;
        return this.oauthService.getConnectedAccounts(tenantId);
    }
}
