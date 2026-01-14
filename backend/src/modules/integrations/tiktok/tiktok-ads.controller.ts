import {
    Controller,
    Get,
    Post,
    Delete,
    Query,
    Body,
    Res,
    Req,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiBody,
    ApiQuery,
    ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TikTokAdsOAuthService } from './tiktok-ads-oauth.service';

/**
 * TikTok Ads OAuth Controller
 * 
 * Provides endpoints for TikTok Ads OAuth flow following Google Ads pattern:
 * 1. GET /url - Get OAuth authorization URL (or sandbox info)
 * 2. GET /callback - Handle OAuth callback from TikTok
 * 3. GET /temp-accounts - Get accounts for selection
 * 4. POST /complete - Complete connection with selected account
 * 5. GET /accounts - Get connected accounts
 * 6. DELETE /disconnect - Disconnect all accounts
 * 
 * @see docs/plans/integration-spec-mapping.md
 */
@ApiTags('TikTok Ads Auth')
@Controller('auth/tiktok')
export class TikTokAdsController {
    private readonly frontendUrl: string;

    constructor(
        private readonly oauthService: TikTokAdsOAuthService,
        private readonly configService: ConfigService,
    ) {
        // Use FRONTEND_URL from environment, fallback to Vite default port
        this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    }

    // ============================================
    // OAuth Flow Endpoints
    // ============================================

    /**
     * Get OAuth authorization URL
     * 
     * In Sandbox mode: Returns sandbox connection info
     * In Production mode: Returns OAuth URL
     */
    @Get('url')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get TikTok OAuth URL or sandbox mode info' })
    @ApiResponse({
        status: 200,
        description: 'Returns OAuth URL or sandbox connection info',
        schema: {
            oneOf: [
                {
                    properties: {
                        isSandbox: { type: 'boolean', example: false },
                        url: { type: 'string', example: 'https://ads.tiktok.com/marketing_api/auth?...' },
                    },
                },
                {
                    properties: {
                        isSandbox: { type: 'boolean', example: true },
                        message: { type: 'string' },
                        connectEndpoint: { type: 'string', example: '/auth/tiktok/connect-sandbox' },
                    },
                },
            ],
        },
    })
    getAuthUrl(@Req() req: any) {
        const userId = req.user.id;
        const tenantId = req.user.tenantId;

        // Check if sandbox mode
        if (this.oauthService.isSandboxMode()) {
            return {
                isSandbox: true,
                message: 'Sandbox mode enabled. Use POST /auth/tiktok/connect-sandbox to connect with pre-configured credentials.',
                connectEndpoint: '/auth/tiktok/connect-sandbox',
            };
        }

        // Production mode - return OAuth URL
        const url = this.oauthService.generateAuthUrl(userId, tenantId);

        return {
            isSandbox: false,
            url,
            message: 'Open this URL in a browser to authorize TikTok Ads access',
        };
    }

    /**
     * OAuth callback endpoint
     * 
     * TikTok redirects here after user authorization.
     * Exchanges code for tokens and redirects to frontend with tempToken.
     */
    @Get('callback')
    @ApiOperation({ summary: 'TikTok OAuth callback endpoint' })
    @ApiQuery({ name: 'code', required: true, description: 'Authorization code from TikTok' })
    @ApiQuery({ name: 'state', required: true, description: 'State parameter for CSRF protection' })
    async handleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ) {
        try {
            if (!code) {
                return res.redirect(
                    `${this.frontendUrl}/integrations?error=missing_code&platform=tiktok`
                );
            }

            if (!state) {
                return res.redirect(
                    `${this.frontendUrl}/integrations?error=missing_state&platform=tiktok`
                );
            }

            // Process callback and get account list
            const result = await this.oauthService.handleCallback(code, state);

            // Redirect to frontend with tempToken for account selection
            return res.redirect(
                `${this.frontendUrl}/integrations?status=${result.status}&tempToken=${result.tempToken}&platform=tiktok`
            );
        } catch (error) {
            console.error('[TikTok OAuth] Callback error:', error);
            return res.redirect(
                `${this.frontendUrl}/integrations?error=${encodeURIComponent(error.message)}&platform=tiktok`
            );
        }
    }

    /**
     * Get temporary accounts for selection
     * 
     * Called by frontend after OAuth callback to display account selection UI.
     */
    @Get('temp-accounts')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get temporary accounts list for selection' })
    @ApiQuery({ name: 'tempToken', required: true, description: 'Temporary token from OAuth callback' })
    @ApiResponse({
        status: 200,
        description: 'List of available TikTok advertiser accounts',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string', example: '7123456789012345678' },
                    name: { type: 'string', example: 'My Advertiser Account' },
                    status: { type: 'string', example: 'ACTIVE' },
                },
            },
        },
    })
    async getTempAccounts(@Query('tempToken') tempToken: string) {
        if (!tempToken) {
            throw new BadRequestException('Missing tempToken parameter');
        }

        const accounts = await this.oauthService.getTempAccounts(tempToken);

        return {
            success: true,
            accounts,
            count: accounts.length,
        };
    }

    /**
     * Complete connection with selected account
     * 
     * Called by frontend after user selects an account from the list.
     */
    @Post('complete')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Complete TikTok connection by selecting an account' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['tempToken', 'advertiserId'],
            properties: {
                tempToken: { type: 'string', description: 'Temporary token from OAuth callback' },
                advertiserId: { type: 'string', description: 'Selected advertiser ID' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Connection completed successfully',
        schema: {
            properties: {
                success: { type: 'boolean', example: true },
                accountId: { type: 'string' },
                accountName: { type: 'string' },
            },
        },
    })
    async completeConnection(
        @Req() req: any,
        @Body('tempToken') tempToken: string,
        @Body('advertiserId') advertiserId: string,
    ) {
        const tenantId = req.user.tenantId;

        if (!tempToken) {
            throw new BadRequestException('Missing tempToken');
        }

        if (!advertiserId) {
            throw new BadRequestException('Missing advertiserId');
        }

        return this.oauthService.completeConnection(tempToken, advertiserId, tenantId);
    }

    // ============================================
    // Sandbox Mode Endpoint
    // ============================================

    /**
     * Connect using sandbox credentials
     * 
     * Only available when TIKTOK_USE_SANDBOX=true
     * Uses pre-configured access token and advertiser ID from environment.
     */
    @Post('connect-sandbox')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Connect TikTok Sandbox account (Sandbox mode only)' })
    @ApiResponse({
        status: 200,
        description: 'Sandbox account connected successfully',
        schema: {
            properties: {
                success: { type: 'boolean', example: true },
                accountId: { type: 'string' },
                accountName: { type: 'string', example: 'TikTok Sandbox Account' },
            },
        },
    })
    async connectSandbox(@Req() req: any) {
        const tenantId = req.user.tenantId;
        return this.oauthService.connectSandbox(tenantId);
    }

    // ============================================
    // Account Management Endpoints
    // ============================================

    /**
     * Get connected TikTok accounts
     */
    @Get('accounts')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get connected TikTok Ads accounts' })
    @ApiResponse({
        status: 200,
        description: 'List of connected accounts',
        schema: {
            properties: {
                success: { type: 'boolean', example: true },
                accounts: {
                    type: 'array',
                    items: {
                        properties: {
                            id: { type: 'string' },
                            advertiserId: { type: 'string' },
                            accountName: { type: 'string' },
                            status: { type: 'string' },
                            lastSyncAt: { type: 'string', format: 'date-time', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
                count: { type: 'number' },
            },
        },
    })
    async getConnectedAccounts(@Req() req: any) {
        const tenantId = req.user.tenantId;
        const accounts = await this.oauthService.getConnectedAccounts(tenantId);

        return {
            success: true,
            accounts,
            count: accounts.length,
        };
    }

    /**
     * Disconnect TikTok Ads integration
     * 
     * Removes all connected TikTok accounts for the tenant.
     */
    @Delete('disconnect')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Disconnect TikTok Ads integration' })
    @ApiResponse({
        status: 200,
        description: 'Disconnected successfully',
        schema: {
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'TikTok Ads disconnected successfully' },
            },
        },
    })
    async disconnect(@Req() req: any) {
        const tenantId = req.user.tenantId;
        await this.oauthService.disconnect(tenantId);

        return {
            success: true,
            message: 'TikTok Ads disconnected successfully',
        };
    }

    // ============================================
    // Token Management Endpoint
    // ============================================

    /**
     * Refresh access token
     * 
     * Manually trigger token refresh for an account.
     * Useful for testing or when automatic refresh fails.
     */
    @Post('refresh-token')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Manually refresh access token for an account' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['accountId'],
            properties: {
                accountId: { type: 'string', description: 'Database account ID (not advertiserId)' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
        schema: {
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Token refreshed successfully' },
            },
        },
    })
    async refreshToken(
        @Req() req: any,
        @Body('accountId') accountId: string,
    ) {
        const tenantId = req.user.tenantId;

        if (!accountId) {
            throw new BadRequestException('Missing accountId');
        }

        await this.oauthService.refreshAccessToken(accountId, tenantId);

        return {
            success: true,
            message: 'Token refreshed successfully',
        };
    }
}
