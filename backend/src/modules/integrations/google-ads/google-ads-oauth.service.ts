import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleAdsClientService } from './services/google-ads-client.service';
import { GoogleAdsCampaignService } from './google-ads-campaign.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { UnifiedSyncService } from '../../sync/unified-sync.service';
import { PlatformType } from '../../../common/enums/platform-type.enum';
import { EncryptionService } from '../../../common/services/encryption.service';

@Injectable()
export class GoogleAdsOAuthService {
  private readonly logger = new Logger(GoogleAdsOAuthService.name);
  private oauth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly googleAdsClientService: GoogleAdsClientService,
    private readonly googleAdsCampaignService: GoogleAdsCampaignService,
    private readonly unifiedSyncService: UnifiedSyncService,
    private readonly encryptionService: EncryptionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI_ADS'),
    );
  }

  async generateAuthUrl(userId: string, tenantId: string): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/adwords', // Google Ads API
    ];

    // Store state for verification
    const state = Buffer.from(
      JSON.stringify({ userId, tenantId, timestamp: Date.now() }),
    ).toString('base64');

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: scopes,
      state: state,
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return authUrl;
  }

  async handleCallback(code: string, state: string) {
    try {
      // Verify state
      const stateData = JSON.parse(
        Buffer.from(state, 'base64').toString('utf-8'),
      );
      const { userId, tenantId } = stateData;

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new BadRequestException('Failed to get tokens from Google');
      }

      // Fetch all selectable accounts using Option B (flatten all accessible accounts)
      let selectableAccounts: {
        id: string;
        name: string;
        type: 'ACCOUNT' | 'MANAGER';
        parentMccId?: string;
        parentMccName?: string;
        status: string;
      }[] = [];

      try {
        selectableAccounts = await this.googleAdsClientService.getAllSelectableAccounts(tokens.refresh_token);
        this.logger.log(`Selectable Google Ads Accounts: ${JSON.stringify(selectableAccounts.map(a => a.id))}`);
      } catch (error) {
        this.logger.error(`Failed to list Google Ads accounts: ${error.message}`);
        throw new BadRequestException(
          `ไม่สามารถดึง Google Ads Accounts ได้: ${error.message}. กรุณาตรวจสอบว่า Developer Token ถูกต้องและ Google Ads API เปิดใช้งานแล้ว`
        );
      }

      if (!selectableAccounts || selectableAccounts.length === 0) {
        throw new BadRequestException(
          'ไม่พบ Google Ads Account ที่เข้าถึงได้. กรุณาตรวจสอบว่าบัญชี Google นี้มีสิทธิ์เข้าถึง Google Ads Account'
        );
      }

      // Generate temp token key
      const tempToken = uuidv4();

      // Store tokens in cache (10 minutes = 600000ms)
      await this.cacheManager.set(`google_ads_temp_tokens:${tempToken}`, tokens, 600000);

      // Store selectable accounts in cache (10 minutes = 600000ms)
      // Format: array of { id, name, type, parentMccId?, parentMccName?, status }
      await this.cacheManager.set(`google_ads_temp_accounts:${tempToken}`, selectableAccounts, 600000);

      return {
        status: 'select_account',
        accounts: selectableAccounts,
        tempToken: tempToken,
      };
    } catch (error) {
      console.error('Error in handleCallback:', error);
      // Re-throw BadRequestException as-is, wrap others
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `OAuth callback failed: ${error.message}`,
      );
    }
  }

  async getTempAccounts(tempToken: string) {
    const accounts = await this.cacheManager.get(`google_ads_temp_accounts:${tempToken}`);
    if (!accounts) {
      throw new BadRequestException('Session expired or invalid token');
    }
    return accounts;
  }

  async completeConnection(tempToken: string, customerId: string, tenantId: string) {
    const tokens = await this.cacheManager.get<any>(`google_ads_temp_tokens:${tempToken}`);

    if (!tokens || !tokens.refresh_token) {
      throw new BadRequestException('Session expired or invalid token');
    }

    const refreshToken = tokens.refresh_token;
    const accessToken = tokens.access_token;
    const tokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Get cached accounts to find the account name
    const cachedAccounts = await this.cacheManager.get<any[]>(`google_ads_temp_accounts:${tempToken}`);
    const selectedAccount = cachedAccounts?.find(acc => acc.id === customerId);
    const accountName = selectedAccount?.name || `Account ${customerId}`;

    const cleanCustomerId = customerId.replace('customers/', '');

    // Check if exists
    const existing = await this.prisma.googleAdsAccount.findFirst({
      where: { tenantId, customerId: cleanCustomerId }
    });

    let accountId: string;

    if (existing) {
      await this.prisma.googleAdsAccount.update({
        where: { id: existing.id },
        data: {
          refreshToken: this.encryptionService.encrypt(refreshToken),
          accountName, // Update with proper name from MCC
          status: 'ENABLED',
          updatedAt: new Date()
        }
      });
      accountId = existing.id;
    } else {
      const newAccount = await this.prisma.googleAdsAccount.create({
        data: {
          customerId: cleanCustomerId,
          accountName, // Use name from MCC flatten
          refreshToken: this.encryptionService.encrypt(refreshToken),
          status: 'ENABLED',
          tenantId: tenantId,
          accessToken: accessToken ? this.encryptionService.encrypt(accessToken) : 'placeholder',
          tokenExpiresAt: tokenExpiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      accountId = newAccount.id;
    }

    // Clear cache
    await this.cacheManager.del(`google_ads_temp_tokens:${tempToken}`);
    await this.cacheManager.del(`google_ads_temp_accounts:${tempToken}`);

    // 🚀 Trigger Initial Sync (non-blocking)
    this.triggerInitialSync(accountId, tenantId);

    return { success: true, accountId };
  }

  /**
   * Trigger Initial Sync for newly connected account (non-blocking)
   */
  private async triggerInitialSync(accountId: string, tenantId: string) {
    try {
      this.logger.log(`[Initial Sync] Starting sync for account ${accountId}`);

      // Create SyncLog entry
      const syncLog = await this.prisma.syncLog.create({
        data: {
          tenantId,
          platform: 'GOOGLE_ADS',
          accountId,
          syncType: 'INITIAL',
          status: 'STARTED',
          startedAt: new Date(),
        }
      });

      // Run sync using Unified Engine
      await this.unifiedSyncService.syncAccount(PlatformType.GOOGLE_ADS, accountId, tenantId);

      // Update SyncLog
      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        }
      });

      this.logger.log(`[Initial Sync] Completed for account ${accountId}`);
    } catch (error) {
      this.logger.error(`[Initial Sync] Failed for account ${accountId}: ${error.message}`);

      // Try to update SyncLog with error
      try {
        await this.prisma.syncLog.updateMany({
          where: { accountId, status: 'STARTED' },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            completedAt: new Date(),
          }
        });
      } catch (e) {
        this.logger.error(`[Initial Sync] Failed to update SyncLog: ${e.message}`);
      }
    }
  }


  /**
   * Save all client accounts from Manager Account to database
   * Optimized to avoid N+1 queries
   */
  async saveClientAccounts(refreshToken: string, userId: string, tenantId: string) {
    try {
      // Log accessible customers for debugging
      try {
        const accessible = await this.googleAdsClientService.listAccessibleCustomers(refreshToken);
        this.logger.debug(`Accessible Customers for this user: ${JSON.stringify(accessible)}`);
      } catch (e) {
        this.logger.warn(`Failed to list accessible customers: ${e.message}`);
      }

      // 1. Get client accounts from Google Ads
      const clientAccounts = await this.googleAdsClientService.getClientAccounts(refreshToken);
      this.logger.log(`Found ${clientAccounts.length} client accounts for user ${userId}`);

      if (clientAccounts.length === 0) {
        return [];
      }

      // 2. Fetch existing accounts in bulk
      const customerIds = clientAccounts.map(a => a.id);
      const existingAccounts = await this.prisma.googleAdsAccount.findMany({
        where: {
          tenantId,
          customerId: { in: customerIds },
        },
      });

      const existingMap = new Map(existingAccounts.map(a => [a.customerId, a]));
      const operations = [];

      // 3. Prepare operations
      for (const account of clientAccounts) {
        const existing = existingMap.get(account.id);

        if (existing) {
          // Update
          operations.push(
            this.prisma.googleAdsAccount.update({
              where: { id: existing.id },
              data: {
                accountName: account.name,
                refreshToken: this.encryptionService.encrypt(refreshToken),
                status: account.status,
                updatedAt: new Date(),
              },
            })
          );
        } else {
          // Create
          operations.push(
            this.prisma.googleAdsAccount.create({
              data: {
                customerId: account.id,
                accountName: account.name,
                refreshToken: this.encryptionService.encrypt(refreshToken),
                status: account.status,
                tenantId: tenantId,
                accessToken: 'placeholder',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            })
          );
        }
      }

      // 4. Execute transaction
      const results = await this.prisma.$transaction(operations);
      this.logger.log(`Processed ${results.length} accounts (Created/Updated)`);

      return results;
    } catch (error) {
      console.error('Failed to save client accounts:', error);
      throw new Error(`Failed to save client accounts: ${error.message}`);
    }
  }

  async getConnectedAccounts(tenantId: string) {
    const accounts = await this.prisma.googleAdsAccount.findMany({
      where: {
        tenantId,
      },
      select: {
        id: true,
        customerId: true,
        accountName: true,
        status: true,
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      accounts: accounts,
      count: accounts.length,
    };
  }

  async getAccessToken(tenantId: string, customerId: string): Promise<string> {
    const account = await this.prisma.googleAdsAccount.findUnique({
      where: {
        tenantId_customerId: {
          tenantId,
          customerId,
        },
      },
    });

    if (!account) {
      throw new BadRequestException('Google Ads account not found');
    }

    // Check if token is expired
    const now = new Date();
    if (account.tokenExpiresAt && account.tokenExpiresAt < now) {
      // Refresh token
      this.oauth2Client.setCredentials({
        refresh_token: this.encryptionService.decrypt(account.refreshToken),
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update in database
      await this.prisma.googleAdsAccount.update({
        where: { id: account.id },
        data: {
          accessToken: this.encryptionService.encrypt(credentials.access_token),
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
        },
      });

      return credentials.access_token;
    }

    return this.encryptionService.decrypt(account.accessToken);
  }

  async disconnect(tenantId: string) {
    // Delete all accounts for this tenant
    // In a real scenario, you might want to soft delete or keep logs, but for now we hard delete
    await this.prisma.googleAdsAccount.deleteMany({
      where: { tenantId }
    });
    return true;
  }
}
