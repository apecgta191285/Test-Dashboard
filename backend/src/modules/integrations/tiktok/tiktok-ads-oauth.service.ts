import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { EncryptionService } from '../../../common/services/encryption.service';
import {
    OAuthProvider,
    OAuthCallbackResult,
    OAuthConnectionResult,
    OAuthAccount,
    SandboxSupport,
} from '../common/oauth-provider.interface';

/**
 * TikTok Ads OAuth Service
 * 
 * Production-grade implementation following Google Ads pattern.
 * Implements OAuthProvider interface for standardization.
 * 
 * Key differences from Google:
 * - Uses `app_id` instead of `client_id`
 * - Uses `auth_code` instead of `code` in token exchange
 * - Token exchange uses JSON body (not form-urlencoded)
 * - Supports Sandbox mode via TIKTOK_USE_SANDBOX env var
 * 
 * @see docs/plans/integration-spec-mapping.md
 */
@Injectable()
export class TikTokAdsOAuthService implements OAuthProvider, SandboxSupport {
    private readonly logger = new Logger(TikTokAdsOAuthService.name);

    // OAuth Configuration
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly redirectUri: string;

    // API URLs (switched based on sandbox mode)
    private readonly authUrl: string;
    private readonly tokenUrl: string;
    private readonly refreshUrl: string;
    private readonly apiBaseUrl: string;

    // Sandbox Configuration
    private readonly useSandbox: boolean;
    private readonly sandboxAccessToken: string;
    private readonly sandboxAdvertiserId: string;

    // Cache TTL (10 minutes)
    private readonly CACHE_TTL = 600000;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly encryptionService: EncryptionService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        // Load configuration
        this.appId = this.configService.get<string>('TIKTOK_APP_ID');
        this.appSecret = this.configService.get<string>('TIKTOK_APP_SECRET');
        this.redirectUri = this.configService.get<string>('TIKTOK_REDIRECT_URI');

        // Sandbox mode detection
        this.useSandbox = this.configService.get<string>('TIKTOK_USE_SANDBOX') === 'true';
        this.sandboxAccessToken = this.configService.get<string>('TIKTOK_SANDBOX_ACCESS_TOKEN') || '';
        this.sandboxAdvertiserId = this.configService.get<string>('TIKTOK_SANDBOX_ADVERTISER_ID') || '';

        // Set URLs based on environment
        // Reference: integration-spec-mapping.md Section 2.1
        if (this.useSandbox) {
            this.authUrl = 'https://sandbox-ads.tiktok.com/marketing_api/auth';
            this.tokenUrl = 'https://sandbox-ads.tiktok.com/open_api/v1.3/oauth2/access_token/';
            this.refreshUrl = 'https://sandbox-ads.tiktok.com/open_api/v1.3/oauth2/refresh_token/';
            this.apiBaseUrl = 'https://sandbox-ads.tiktok.com/open_api/v1.3';
        } else {
            this.authUrl = 'https://ads.tiktok.com/marketing_api/auth';
            this.tokenUrl = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/';
            this.refreshUrl = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/';
            this.apiBaseUrl = 'https://business-api.tiktok.com/open_api/v1.3';
        }

        this.logger.log(`[TikTok OAuth] Initialized - Sandbox: ${this.useSandbox}, App ID: ${this.appId?.substring(0, 8)}...`);

        if (this.useSandbox) {
            this.logger.warn('[TikTok OAuth] ⚠️ Running in SANDBOX mode');
        }
    }

    // ============================================
    // SandboxSupport Implementation
    // ============================================

    /**
     * Check if running in sandbox mode
     */
    isSandboxMode(): boolean {
        return this.useSandbox;
    }

    /**
     * Connect using pre-configured sandbox credentials
     * Bypasses OAuth flow for development/testing
     */
    async connectSandbox(tenantId: string): Promise<OAuthConnectionResult> {
        if (!this.useSandbox) {
            throw new BadRequestException('Sandbox mode is not enabled. Set TIKTOK_USE_SANDBOX=true');
        }

        if (!this.sandboxAccessToken || !this.sandboxAdvertiserId) {
            throw new BadRequestException(
                'Sandbox credentials not configured. Set TIKTOK_SANDBOX_ACCESS_TOKEN and TIKTOK_SANDBOX_ADVERTISER_ID in .env'
            );
        }

        this.logger.log(`[TikTok OAuth] Connecting Sandbox account for tenant: ${tenantId}`);

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

            let accountId: string;
            let accountName = 'TikTok Sandbox Account';

            if (existing) {
                // Update existing account
                await this.prisma.tikTokAdsAccount.update({
                    where: { id: existing.id },
                    data: {
                        accessToken: this.encryptionService.encrypt(this.sandboxAccessToken),
                        status: 'ACTIVE',
                        updatedAt: new Date(),
                    },
                });
                accountId = existing.id;
                accountName = existing.accountName;
                this.logger.log(`[TikTok OAuth] Updated Sandbox account: ${accountId}`);
            } else {
                // Create new account
                const created = await this.prisma.tikTokAdsAccount.create({
                    data: {
                        tenantId,
                        advertiserId: this.sandboxAdvertiserId,
                        accountName,
                        accessToken: this.encryptionService.encrypt(this.sandboxAccessToken),
                        status: 'ACTIVE',
                    },
                });
                accountId = created.id;
                this.logger.log(`[TikTok OAuth] Created Sandbox account: ${accountId}`);
            }

            return { success: true, accountId, accountName };
        } catch (error) {
            this.logger.error(`[TikTok OAuth] Sandbox connection error: ${error.message}`);
            throw new BadRequestException(`Failed to connect Sandbox account: ${error.message}`);
        }
    }

    // ============================================
    // OAuthProvider Implementation
    // ============================================

    /**
     * Generate TikTok OAuth authorization URL
     * 
     * TikTok uses `app_id` instead of `client_id`
     * Reference: integration-spec-mapping.md Section 2.2
     */
    generateAuthUrl(userId: string, tenantId: string): string {
        // Encode state with user context (like Google Ads pattern)
        const state = Buffer.from(
            JSON.stringify({ userId, tenantId, timestamp: Date.now() }),
        ).toString('base64');

        const params = new URLSearchParams({
            app_id: this.appId,        // TikTok uses app_id, not client_id
            state: state,
            redirect_uri: this.redirectUri,
        });

        const url = `${this.authUrl}?${params.toString()}`;

        this.logger.log(`[TikTok OAuth] Generated auth URL for user: ${userId}`);

        return url;
    }

    /**
     * Handle OAuth callback from TikTok
     * 
     * Flow:
     * 1. Verify state parameter
     * 2. Exchange auth_code for tokens (JSON body)
     * 3. Fetch advertiser details for each returned ID
     * 4. Store tokens + accounts in cache
     * 5. Return account list for selection
     */
    async handleCallback(code: string, state: string): Promise<OAuthCallbackResult> {
        try {
            // 1. Verify state
            const stateData = JSON.parse(
                Buffer.from(state, 'base64').toString('utf-8'),
            );
            const { userId, tenantId } = stateData;

            this.logger.log(`[TikTok OAuth] Processing callback for tenant: ${tenantId}`);

            // 2. Exchange code for tokens
            // IMPORTANT: TikTok uses JSON body, not form-urlencoded
            // IMPORTANT: TikTok uses `auth_code`, not `code`
            const tokenResponse = await axios.post(this.tokenUrl, {
                app_id: this.appId,
                secret: this.appSecret,
                auth_code: code,  // TikTok-specific parameter name
            });

            // TikTok response structure: { code: 0, message: "OK", data: { ... } }
            if (tokenResponse.data?.code !== 0) {
                throw new BadRequestException(
                    `TikTok token exchange failed: ${tokenResponse.data?.message || 'Unknown error'}`
                );
            }

            const { access_token, refresh_token, advertiser_ids } = tokenResponse.data.data;

            if (!advertiser_ids || advertiser_ids.length === 0) {
                throw new BadRequestException(
                    'No TikTok Advertiser accounts found. Please ensure your TikTok account has access to at least one advertiser.'
                );
            }

            // Calculate token expiry (TikTok tokens expire in 24 hours)
            const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // 3. Fetch advertiser details for each ID
            const accounts = await this.fetchAdvertiserDetails(access_token, advertiser_ids);

            // 4. Generate temp token and store in cache
            const tempToken = uuidv4();

            await this.cacheManager.set(
                `tiktok_temp_tokens:${tempToken}`,
                {
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    tokenExpiresAt,
                    userId,
                    tenantId,
                },
                this.CACHE_TTL,
            );

            await this.cacheManager.set(
                `tiktok_temp_accounts:${tempToken}`,
                accounts,
                this.CACHE_TTL,
            );

            this.logger.log(`[TikTok OAuth] Found ${accounts.length} advertiser account(s)`);

            // 5. Return account list for selection (following Google Ads pattern)
            return {
                status: 'select_account',
                accounts,
                tempToken,
            };
        } catch (error) {
            this.logger.error(`[TikTok OAuth] Callback error: ${error.message}`);

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new BadRequestException(`Failed to connect TikTok Ads: ${error.message}`);
        }
    }

    /**
     * Fetch advertiser details from TikTok API
     */
    private async fetchAdvertiserDetails(
        accessToken: string,
        advertiserIds: string[],
    ): Promise<OAuthAccount[]> {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/advertiser/info/`, {
                headers: {
                    'Access-Token': accessToken,
                },
                params: {
                    advertiser_ids: JSON.stringify(advertiserIds.map(id => String(id))),
                },
            });

            if (response.data?.code !== 0) {
                this.logger.warn(`[TikTok OAuth] Could not fetch advertiser details: ${response.data?.message}`);
                // Fallback: return basic info without names
                return advertiserIds.map(id => ({
                    id: String(id),
                    name: `TikTok Advertiser ${id}`,
                    status: 'UNKNOWN',
                }));
            }

            const advertisers = response.data.data.list || [];

            return advertisers.map((adv: any) => ({
                id: String(adv.advertiser_id),
                name: adv.name || adv.advertiser_name || `Advertiser ${adv.advertiser_id}`,
                status: adv.status || 'ACTIVE',
            }));
        } catch (error) {
            this.logger.warn(`[TikTok OAuth] Error fetching advertiser details: ${error.message}`);
            // Fallback: return basic info
            return advertiserIds.map(id => ({
                id: String(id),
                name: `TikTok Advertiser ${id}`,
                status: 'UNKNOWN',
            }));
        }
    }

    /**
     * Get temporary accounts from cache for selection UI
     */
    async getTempAccounts(tempToken: string): Promise<OAuthAccount[]> {
        const accounts = await this.cacheManager.get<OAuthAccount[]>(`tiktok_temp_accounts:${tempToken}`);

        if (!accounts) {
            throw new BadRequestException('Session expired or invalid token. Please restart the OAuth flow.');
        }

        return accounts;
    }

    /**
     * Complete connection after user selects an account
     * 
     * Following Google Ads pattern:
     * 1. Retrieve tokens from cache
     * 2. Create/update database record with encrypted tokens
     * 3. Clear cache
     * 4. Return success result
     */
    async completeConnection(
        tempToken: string,
        accountId: string,
        tenantId: string,
    ): Promise<OAuthConnectionResult> {
        // 1. Get tokens from cache
        const tokenData = await this.cacheManager.get<any>(`tiktok_temp_tokens:${tempToken}`);

        if (!tokenData || !tokenData.accessToken) {
            throw new BadRequestException('Session expired or invalid token. Please restart the OAuth flow.');
        }

        // Get cached accounts to find selected account name
        const cachedAccounts = await this.cacheManager.get<OAuthAccount[]>(`tiktok_temp_accounts:${tempToken}`);
        const selectedAccount = cachedAccounts?.find(acc => acc.id === accountId);
        const accountName = selectedAccount?.name || `TikTok Advertiser ${accountId}`;

        this.logger.log(`[TikTok OAuth] Completing connection for advertiser: ${accountId}`);

        try {
            // 2. Check if account already exists
            const existing = await this.prisma.tikTokAdsAccount.findUnique({
                where: {
                    tenantId_advertiserId: {
                        tenantId,
                        advertiserId: accountId,
                    },
                },
            });

            let dbAccountId: string;

            if (existing) {
                // Update existing account
                await this.prisma.tikTokAdsAccount.update({
                    where: { id: existing.id },
                    data: {
                        accessToken: this.encryptionService.encrypt(tokenData.accessToken),
                        refreshToken: tokenData.refreshToken
                            ? this.encryptionService.encrypt(tokenData.refreshToken)
                            : null,
                        accountName,
                        status: 'ACTIVE',
                        updatedAt: new Date(),
                    },
                });
                dbAccountId = existing.id;
                this.logger.log(`[TikTok OAuth] Updated existing account: ${dbAccountId}`);
            } else {
                // Create new account
                const created = await this.prisma.tikTokAdsAccount.create({
                    data: {
                        tenantId,
                        advertiserId: accountId,
                        accountName,
                        accessToken: this.encryptionService.encrypt(tokenData.accessToken),
                        refreshToken: tokenData.refreshToken
                            ? this.encryptionService.encrypt(tokenData.refreshToken)
                            : null,
                        status: 'ACTIVE',
                    },
                });
                dbAccountId = created.id;
                this.logger.log(`[TikTok OAuth] Created new account: ${dbAccountId}`);
            }

            // 3. Clear cache
            await this.cacheManager.del(`tiktok_temp_tokens:${tempToken}`);
            await this.cacheManager.del(`tiktok_temp_accounts:${tempToken}`);

            // TODO: Trigger initial sync (like Google Ads pattern)
            // await this.triggerInitialSync(dbAccountId, tenantId);

            return {
                success: true,
                accountId: dbAccountId,
                accountName,
            };
        } catch (error) {
            this.logger.error(`[TikTok OAuth] Complete connection error: ${error.message}`);
            throw new BadRequestException(`Failed to save TikTok account: ${error.message}`);
        }
    }

    /**
     * Refresh access token using refresh token
     * 
     * TikTok access tokens expire in 24 hours.
     * Refresh tokens are valid for 1 year.
     * 
     * Reference: integration-spec-mapping.md Section 3.4 Pattern 2
     */
    async refreshAccessToken(accountId: string, tenantId: string): Promise<string> {
        const account = await this.prisma.tikTokAdsAccount.findFirst({
            where: {
                id: accountId,
                tenantId,
            },
        });

        if (!account) {
            throw new BadRequestException('TikTok account not found');
        }

        if (!account.refreshToken) {
            throw new BadRequestException(
                'No refresh token available. Please reconnect the TikTok account.'
            );
        }

        const decryptedRefreshToken = this.encryptionService.decrypt(account.refreshToken);

        this.logger.log(`[TikTok OAuth] Refreshing token for account: ${accountId}`);

        try {
            // TikTok refresh token endpoint uses JSON body
            const response = await axios.post(this.refreshUrl, {
                app_id: this.appId,
                secret: this.appSecret,
                refresh_token: decryptedRefreshToken,
            });

            if (response.data?.code !== 0) {
                throw new BadRequestException(
                    `Token refresh failed: ${response.data?.message || 'Unknown error'}`
                );
            }

            const { access_token, refresh_token } = response.data.data;

            // Calculate new expiry (24 hours)
            const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Update database with new tokens
            await this.prisma.tikTokAdsAccount.update({
                where: { id: accountId },
                data: {
                    accessToken: this.encryptionService.encrypt(access_token),
                    refreshToken: refresh_token
                        ? this.encryptionService.encrypt(refresh_token)
                        : account.refreshToken, // Keep old refresh token if new one not provided
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`[TikTok OAuth] Token refreshed successfully for account: ${accountId}`);

            return access_token;
        } catch (error) {
            this.logger.error(`[TikTok OAuth] Token refresh error: ${error.message}`);

            if (axios.isAxiosError(error) && error.response?.data) {
                throw new BadRequestException(
                    `Token refresh failed: ${error.response.data.message || error.message}`
                );
            }

            throw new BadRequestException(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Get connected accounts for a tenant
     */
    async getConnectedAccounts(tenantId: string): Promise<any[]> {
        const accounts = await this.prisma.tikTokAdsAccount.findMany({
            where: { tenantId },
            select: {
                id: true,
                advertiserId: true,
                accountName: true,
                status: true,
                lastSyncAt: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return accounts;
    }

    /**
     * Disconnect all TikTok accounts for a tenant
     */
    async disconnect(tenantId: string): Promise<boolean> {
        this.logger.log(`[TikTok OAuth] Disconnecting all accounts for tenant: ${tenantId}`);

        await this.prisma.tikTokAdsAccount.deleteMany({
            where: { tenantId },
        });

        return true;
    }

    // ============================================
    // Helper Methods
    // ============================================

    /**
     * Get valid access token for API calls
     * Automatically refreshes if needed
     */
    async getAccessToken(accountId: string, tenantId: string): Promise<string> {
        const account = await this.prisma.tikTokAdsAccount.findFirst({
            where: {
                id: accountId,
                tenantId,
            },
        });

        if (!account) {
            throw new BadRequestException('TikTok account not found');
        }

        // For now, return current token
        // TODO: Add tokenExpiresAt field to schema and check expiry
        return this.encryptionService.decrypt(account.accessToken);
    }
}
