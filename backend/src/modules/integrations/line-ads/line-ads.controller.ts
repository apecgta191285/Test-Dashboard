import { Controller, Get, Query, Res, UseGuards, Req } from '@nestjs/common';
import { LineAdsOAuthService } from './line-ads-oauth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth/line')
export class LineAdsController {
    private readonly frontendUrl: string;

    constructor(
        private readonly lineAdsOAuthService: LineAdsOAuthService,
        private readonly configService: ConfigService,
    ) {
        // Use FRONTEND_URL from environment, fallback to Vite default port
        this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    }

    @Get('url')
    @UseGuards(JwtAuthGuard)
    getAuthUrl(@Req() req) {
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const url = this.lineAdsOAuthService.generateAuthUrl(userId, tenantId);
        return { url };
    }

    @Get('callback')
    async handleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ) {
        try {
            await this.lineAdsOAuthService.handleCallback(code, state);
            return res.redirect(`${this.frontendUrl}/integrations?status=success&platform=line`);
        } catch (error) {
            // Ensure error message is safely encoded for URL
            const errorMessage = encodeURIComponent(error?.message || 'Unknown error');
            return res.redirect(`${this.frontendUrl}/integrations?status=error&message=${errorMessage}&platform=line`);
        }
    }
}
