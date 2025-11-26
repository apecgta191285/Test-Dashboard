import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleAdsOAuthService {
  private oauth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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

      // Get customer ID from Google Ads API (will implement in Phase 2)
      // For now, use the login customer ID from env
      const customerId = this.configService.get(
        'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
      );

      // Save to database
      const account = await this.prisma.googleAdsAccount.upsert({
        where: {
          tenantId_customerId: {
            tenantId,
            customerId,
          },
        },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
          status: 'active',
        },
        create: {
          tenantId,
          customerId,
          customerName: 'Google Ads Account', // Will update in Phase 2
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
          status: 'active',
        },
      });

      return {
        accountId: account.id,
        customerId: account.customerId,
      };
    } catch (error) {
      console.error('Error in handleCallback:', error);
      throw new BadRequestException(
        `OAuth callback failed: ${error.message}`,
      );
    }
  }

  async getConnectedAccounts(tenantId: string) {
    const accounts = await this.prisma.googleAdsAccount.findMany({
      where: {
        tenantId,
        status: 'active',
      },
      select: {
        id: true,
        customerId: true,
        customerName: true,
        status: true,
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: accounts,
      total: accounts.length,
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
