import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { UnifiedSyncService } from '../../sync/unified-sync.service';
import { AdPlatform, SyncType, SyncStatus } from '@prisma/client';
import { EncryptionService } from '../../../common/services/encryption.service';

@Injectable()
export class GoogleAnalyticsOAuthService {
    private oauth2Client;
    private readonly logger = new Logger(GoogleAnalyticsOAuthService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly unifiedSyncService: UnifiedSyncService,
        private readonly encryptionService: EncryptionService,
    ) {
        this.oauth2Client = new google.auth.OAuth2(
            this.configService.get('GOOGLE_CLIENT_ID'),
            this.configService.get('GOOGLE_CLIENT_SECRET'),
            this.configService.get('GOOGLE_REDIRECT_URI_GA4'),
        );
    }

    async generateAuthUrl(userId: string, tenantId: string): Promise<string> {
        const scopes = [
            'https://www.googleapis.com/auth/analytics.readonly',
        ];

        const state = Buffer.from(
            JSON.stringify({ userId, tenantId, timestamp: Date.now() }),
        ).toString('base64');

        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: state,
            prompt: 'consent',
        });

        return authUrl;
    }

    async handleCallback(code: string, state: string) {
        try {
            const stateData = JSON.parse(
                Buffer.from(state, 'base64').toString('utf-8'),
            );
            const { tenantId } = stateData;

            const { tokens } = await this.oauth2Client.getToken(code);

            if (!tokens.access_token || !tokens.refresh_token) {
                throw new BadRequestException('Failed to get tokens from Google');
            }

            // Fetch accessible properties
            const properties = await this.listProperties(tokens.access_token);

            // Generate temp token key
            const tempToken = uuidv4();

            // Store refresh token in cache (10 minutes = 600000ms)
            await this.cacheManager.set(`ga4_temp_token:${tempToken}`, tokens.refresh_token, 600000);

            // Store properties in cache (10 minutes = 600000ms)
            await this.cacheManager.set(`ga4_temp_properties:${tempToken}`, properties, 600000);

            return {
                status: 'select_account',
                properties: properties,
                tempToken: tempToken,
            };
        } catch (error) {
            this.logger.error('Error in handleCallback:', error);
            throw new BadRequestException(
                `OAuth callback failed: ${error.message}`,
            );
        }
    }

    async getTempProperties(tempToken: string) {
        const properties = await this.cacheManager.get(`ga4_temp_properties:${tempToken}`);
        if (!properties) {
            throw new BadRequestException('Session expired or invalid token');
        }
        return properties;
    }

    async completeConnection(tempToken: string, propertyId: string, tenantId: string) {
        const refreshToken = await this.cacheManager.get<string>(`ga4_temp_token:${tempToken}`);

        if (!refreshToken) {
            throw new BadRequestException('Session expired or invalid token');
        }

        // Get cached properties to find the property name
        const cachedProperties = await this.cacheManager.get<any[]>(`ga4_temp_properties:${tempToken}`);
        const selectedProperty = cachedProperties?.find(p => p.propertyId === propertyId);
        const propertyName = selectedProperty?.displayName || `Property ${propertyId}`;

        // Check if exists
        const existing = await this.prisma.googleAnalyticsAccount.findFirst({
            where: { tenantId, propertyId }
        });

        let accountId: string;

        if (existing) {
            await this.prisma.googleAnalyticsAccount.update({
                where: { id: existing.id },
                data: {
                    refreshToken: this.encryptionService.encrypt(refreshToken),
                    propertyName,
                    status: 'ACTIVE',
                    updatedAt: new Date()
                }
            });
            accountId = existing.id;
        } else {
            const newAccount = await this.prisma.googleAnalyticsAccount.create({
                data: {
                    tenantId,
                    propertyId,
                    propertyName,
                    refreshToken: this.encryptionService.encrypt(refreshToken),
                    accessToken: 'placeholder',
                    status: 'ACTIVE'
                }
            });
            accountId = newAccount.id;
        }

        // Clear cache
        await this.cacheManager.del(`ga4_temp_token:${tempToken}`);
        await this.cacheManager.del(`ga4_temp_properties:${tempToken}`);

        // Trigger Initial Sync for GA4 (non-blocking) using Unified Engine
        this.triggerInitialSync(accountId, tenantId);

        return { success: true, accountId };
    }

    private async triggerInitialSync(accountId: string, tenantId: string) {
        try {
            this.logger.log(`[Initial Sync] Starting sync for GA4 account ${accountId}`);

            // Create SyncLog entry
            const syncLog = await this.prisma.syncLog.create({
                data: {
                    tenantId,
                    platform: AdPlatform.GOOGLE_ANALYTICS,
                    accountId,
                    syncType: SyncType.INITIAL,
                    status: SyncStatus.STARTED,
                    startedAt: new Date(),
                }
            });

            // Run sync
            await this.unifiedSyncService.syncAccount(AdPlatform.GOOGLE_ANALYTICS, accountId, tenantId);

            // Update SyncLog
            await this.prisma.syncLog.update({
                where: { id: syncLog.id },
                data: {
                    status: SyncStatus.COMPLETED,
                    completedAt: new Date(),
                }
            });

            this.logger.log(`[Initial Sync] Completed for GA4 account ${accountId}`);
        } catch (error) {
            this.logger.error(`[Initial Sync] Failed for GA4 account ${accountId}: ${error.message}`);
        }
    }

    private async listProperties(accessToken: string) {
        try {
            // Create a fresh OAuth2 client for this request to avoid race conditions
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: accessToken });

            const analyticsAdmin = google.analyticsadmin({
                version: 'v1beta',
                auth: auth
            });

            const accountSummaries = await analyticsAdmin.accountSummaries.list();

            const properties = [];
            if (accountSummaries.data.accountSummaries) {
                for (const account of accountSummaries.data.accountSummaries) {
                    if (account.propertySummaries) {
                        for (const prop of account.propertySummaries) {
                            properties.push({
                                propertyId: prop.property.split('/')[1],
                                displayName: prop.displayName
                            });
                        }
                    }
                }
            }

            this.logger.log(`Found ${properties.length} GA4 properties`);
            return properties;

        } catch (error) {
            this.logger.error(`Failed to list GA4 properties: ${error.message}`, error.stack);
            throw new BadRequestException(
                `ไม่สามารถดึง GA4 Properties ได้: ${error.message}. กรุณาตรวจสอบว่าเปิด Google Analytics Admin API ใน Google Cloud Console แล้ว`
            );
        }
    }

    async getConnectionStatus(tenantId: string) {
        const account = await this.prisma.googleAnalyticsAccount.findFirst({
            where: { tenantId, status: 'ACTIVE' },
            select: {
                id: true,
                propertyId: true,
                propertyName: true,
                status: true,
                createdAt: true,
            }
        });

        return {
            isConnected: !!account,
            account: account || null,
        };
    }
}
