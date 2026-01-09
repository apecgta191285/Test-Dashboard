import { Controller, Get, Query, Res, UseGuards, Req } from '@nestjs/common';
import { LineAdsOAuthService } from './line-ads-oauth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth/line')
export class LineAdsController {
    constructor(
        private readonly lineAdsOAuthService: LineAdsOAuthService,
        private readonly configService: ConfigService,
    ) { }

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
            const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
            return res.redirect(`${frontendUrl}/integrations?status=success&platform=line`);
        } catch (error) {
            const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
            return res.redirect(`${frontendUrl}/integrations?status=error&message=${encodeURIComponent(error.message)}`);
        }
    }
}
