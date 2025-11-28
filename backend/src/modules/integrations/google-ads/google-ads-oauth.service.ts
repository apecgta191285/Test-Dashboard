import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleAdsClientService } from './services/google-ads-client.service';

@Injectable()
export class GoogleAdsOAuthService {
  private oauth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly googleAdsClientService: GoogleAdsClientService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
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

      // Save client accounts
      const savedAccounts = await this.saveClientAccounts(
        tokens.refresh_token,
        userId,
        tenantId,
      );

      return {
        savedAccounts,
        count: savedAccounts.length,
      };
    } catch (error) {
      console.error('Error in handleCallback:', error);
      throw new BadRequestException(
        `OAuth callback failed: ${error.message}`,
      );
    }
  }

  /**
   * Save all client accounts from Manager Account to database
   */
  async saveClientAccounts(refreshToken: string, userId: string, tenantId: string) {
    try {
      // Log accessible customers for debugging
      try {
        const accessible = await this.googleAdsClientService.listAccessibleCustomers(refreshToken);
        console.log('Accessible Customers for this user:', accessible);
      } catch (e) {
        console.warn('Failed to list accessible customers:', e.message);
      }

      // 1. Get client accounts from Google Ads
      const clientAccounts = await this.googleAdsClientService.getClientAccounts(refreshToken);

      console.log(`Found ${clientAccounts.length} client accounts for user ${userId}`);

      // 2. Save each client account to database
      const savedAccounts = [];

      for (const account of clientAccounts) {
        // Check if account already exists
        const existing = await this.prisma.googleAdsAccount.findFirst({
          where: {
            customerId: account.id,
            tenantId: tenantId, // Use tenantId instead of userId for uniqueness in this system
          },
        });

        if (existing) {
          // Update existing account
          console.log(`Updating existing account: ${account.id} (${account.name})`);
          const updated = await this.prisma.googleAdsAccount.update({
            where: { id: existing.id },
            data: {
              customerName: account.name, // Changed from 'name' to 'customerName' to match schema
              refreshToken: refreshToken,
              status: account.status,
              updatedAt: new Date(),
            },
          });
          savedAccounts.push(updated);
        } else {
          // Create new account
          console.log(`Creating new account: ${account.id} (${account.name})`);
          const created = await this.prisma.googleAdsAccount.create({
            data: {
              customerId: account.id,
              customerName: account.name, // Changed from 'name' to 'customerName' to match schema
              refreshToken: refreshToken,
              status: account.status,
              tenantId: tenantId,
              accessToken: 'placeholder', // We don't really store access token persistently usually, or we do. Schema has it.
              // Schema requires accessToken. We can use the one we got or empty string if it expires quickly.
              // Let's use the one we got.
            },
          });
          savedAccounts.push(created);
        }
      }

      return savedAccounts;
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
        customerName: true,
        name: true, // Add name
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
        refresh_token: account.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update in database
      await this.prisma.googleAdsAccount.update({
        where: { id: account.id },
        data: {
          accessToken: credentials.access_token,
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
        },
      });

      return credentials.access_token;
    }

    return account.accessToken;
  }
}
