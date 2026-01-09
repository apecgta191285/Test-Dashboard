import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { EncryptionService } from '../../../common/services/encryption.service';

@Injectable()
export class TikTokAdsOAuthService {
    private readonly logger = new Logger(TikTokAdsOAuthService.name);
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly redirectUri: string;
    private readonly authUrl: string;
    private readonly tokenApiUrl: string;
    private readonly useSandbox: boolean;
    private readonly sandboxAccessToken: string;
    private readonly sandboxAdvertiserId: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly encryptionService: EncryptionService,
    ) {
        this.appId = this.configService.get('TIKTOK_APP_ID');
        this.appSecret = this.configService.get('TIKTOK_APP_SECRET');
        this.redirectUri = this.configService.get('TIKTOK_REDIRECT_URI');

        // Choose Sandbox or Production based on environment variable
        this.useSandbox = this.configService.get('TIKTOK_USE_SANDBOX') === 'true';

        // Sandbox credentials
        this.sandboxAccessToken = this.configService.get('TIKTOK_SANDBOX_ACCESS_TOKEN') || '';
        this.sandboxAdvertiserId = this.configService.get('TIKTOK_SANDBOX_ADVERTISER_ID') || '';

        // API URLs based on environment
        this.authUrl = this.useSandbox
            ? 'https://sandbox-ads.tiktok.com/marketing_api/auth'
            : 'https://ads.tiktok.com/marketing_api/auth';
        this.tokenApiUrl = this.useSandbox
            ? 'https://sandbox-ads.tiktok.com/open_api/v1.3/oauth2'
            : 'https://business-api.tiktok.com/open_api/v1.3/oauth2';

        this.logger.log(`[TikTokOAuth] Initialized - Sandbox: ${this.useSandbox}, App ID: ${this.appId}`);

        if (this.useSandbox) {
            this.logger.warn('[TikTokOAuth] ⚠️ Running in SANDBOX mode - OAuth will use pre-configured token');
        }
    }

    /**
     * Check if running in sandbox mode
     */
    isSandboxMode(): boolean {
        return this.useSandbox;
    }

    /**
     * Generate OAuth URL (Production mode only)
     */
    generateAuthUrl(userId: string, tenantId: string): string {
        const state = Buffer.from(
            JSON.stringify({ userId, tenantId, timestamp: Date.now() }),
        ).toString('base64');

        const params = new URLSearchParams({
            app_id: this.appId,
            state: state,
            redirect_uri: this.redirectUri,
        });

        return `${this.authUrl}?${params.toString()}`;
    }

    /**
     * Connect using Sandbox credentials (Sandbox mode)
     * Uses pre-configured access token and advertiser ID from environment variables
     */
    async connectSandbox(tenantId: string) {
        if (!this.useSandbox) {
            throw new BadRequestException('Sandbox mode is not enabled');
        }

        if (!this.sandboxAccessToken || !this.sandboxAdvertiserId) {
            throw new BadRequestException(
                'Sandbox credentials not configured. Please set TIKTOK_SANDBOX_ACCESS_TOKEN and TIKTOK_SANDBOX_ADVERTISER_ID in .env'
            );
        }

        this.logger.log(`[TikTokOAuth] Connecting Sandbox account for tenant: ${tenantId}`);

        try {
            // Check if account already exists
            const existing = await this.prisma.tikTokAdsAccount.findUnique({
                where: {
                    tenantId_advertiserId: {
                        tenantId,
                        advertiserId: this.sandboxAdvertiserId,
                    },
                },
            });

            if (existing) {
                // Update existing account
                const updated = await this.prisma.tikTokAdsAccount.update({
                    where: { id: existing.id },
                    data: {
                        accessToken: this.encryptionService.encrypt(this.sandboxAccessToken),
                        status: 'ACTIVE',
                        updatedAt: new Date(),
                    },
                });
                this.logger.log(`[TikTokOAuth] Updated Sandbox account: ${updated.id}`);
                return { success: true, account: updated, isNew: false };
            } else {
                // Create new account
                const created = await this.prisma.tikTokAdsAccount.create({
                    data: {
                        tenantId,
                        advertiserId: this.sandboxAdvertiserId,
                        accountName: `TikTok Sandbox Account`,
                        accessToken: this.encryptionService.encrypt(this.sandboxAccessToken),
                        status: 'ACTIVE',
                    },
                });
                this.logger.log(`[TikTokOAuth] Created Sandbox account: ${created.id}`);
                return { success: true, account: created, isNew: true };
            }
        } catch (error) {
            this.logger.error(`[TikTokOAuth] Sandbox connection error: ${error.message}`);
            throw new BadRequestException(`Failed to connect Sandbox account: ${error.message}`);
        }
    }

    /**
     * Handle OAuth callback (Production mode)
     */
    async handleCallback(authCode: string, state: string) {
        try {
            // 1. Verify State
            const stateData = JSON.parse(
                Buffer.from(state, 'base64').toString('utf-8'),
            );
            const { tenantId } = stateData;

            // 2. Exchange Code for Token
            const tokenResponse = await axios.post(`${this.tokenApiUrl}/access_token/`, {
                app_id: this.appId,
                secret: this.appSecret,
                auth_code: authCode,
            });

            if (tokenResponse.data?.code !== 0) {
                throw new BadRequestException(`TikTok Token Exchange Failed: ${tokenResponse.data?.message}`);
            }

            const { access_token, refresh_token, advertiser_ids } = tokenResponse.data.data;

            if (!advertiser_ids || advertiser_ids.length === 0) {
                throw new BadRequestException('No TikTok Advertiser Accounts found');
            }

            // 3. Save Accounts (Loop through all advertisers)
            const savedAccounts = [];
            for (const advertiserId of advertiser_ids) {
                // Check if exists
                const existing = await this.prisma.tikTokAdsAccount.findUnique({
                    where: {
                        tenantId_advertiserId: {
                            tenantId,
                            advertiserId: String(advertiserId),
                        },
                    },
                });

                if (existing) {
                    const updated = await this.prisma.tikTokAdsAccount.update({
                        where: { id: existing.id },
                        data: {
                            accessToken: this.encryptionService.encrypt(access_token),
                            refreshToken: this.encryptionService.encrypt(refresh_token),
                            status: 'ACTIVE',
                            updatedAt: new Date(),
                        },
                    });
                    savedAccounts.push(updated);
                } else {
                    const created = await this.prisma.tikTokAdsAccount.create({
                        data: {
                            tenantId,
                            advertiserId: String(advertiserId),
                            accountName: `TikTok Advertiser ${advertiserId}`,
                            accessToken: this.encryptionService.encrypt(access_token),
                            refreshToken: this.encryptionService.encrypt(refresh_token),
                            status: 'ACTIVE',
                        },
                    });
                    savedAccounts.push(created);
                }
            }

            return {
                success: true,
                count: savedAccounts.length,
                accounts: savedAccounts,
            };

        } catch (error) {
            this.logger.error(`TikTok Callback Error: ${error.message}`);
            throw new BadRequestException(`Failed to connect TikTok Ads: ${error.message}`);
        }
    }
}
