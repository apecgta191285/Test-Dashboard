import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../../../prisma/prisma.service';
import { GoogleAdsClientService } from './google-ads-client.service';

@Injectable()
export class GoogleAdsApiService {
    private readonly logger = new Logger(GoogleAdsApiService.name);
    private oauth2Client;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly googleAdsClientService: GoogleAdsClientService,
    ) {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        const redirectUri = this.configService.get('GOOGLE_REDIRECT_URI_ADS');

        this.logger.log(`Initializing GoogleAdsApiService:`);
        this.logger.log(`- Client ID: ${clientId?.substring(0, 10)}...`);
        this.logger.log(`- Client Secret: ${clientSecret ? 'Present (' + clientSecret.length + ' chars)' : 'MISSING'}`);
        this.logger.log(`- Redirect URI: ${redirectUri}`);

        this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri,
        );
    }

    /**
     * Refresh access token if expired
     */
    async refreshTokenIfNeeded(account: any): Promise<void> {
        const now = new Date();
        const shouldRefresh =
            !account.tokenExpiresAt ||
            account.tokenExpiresAt < now ||
            !account.accessToken;

        if (shouldRefresh && account.refreshToken) {
            try {
                this.logger.log(`[Token Refresh] Checking status for account ${account.id}:`);
                this.logger.log(`- Now: ${now.toISOString()}`);
                this.logger.log(`- ExpiresAt: ${account.tokenExpiresAt ? account.tokenExpiresAt.toISOString() : 'NULL'}`);
                this.logger.log(`- Has AccessToken: ${!!account.accessToken}`);
                this.logger.log(`- Client ID used: ${this.configService.get('GOOGLE_CLIENT_ID')?.substring(0, 10)}...`);
                
                this.logger.log(`Refreshing token for account ${account.id}`);
                this.oauth2Client.setCredentials({
                    refresh_token: account.refreshToken,
                });

                const { credentials } = await this.oauth2Client.refreshAccessToken();

                await this.prisma.googleAdsAccount.update({
                    where: { id: account.id },
                    data: {
                        accessToken: credentials.access_token,
                        tokenExpiresAt: credentials.expiry_date
                            ? new Date(credentials.expiry_date)
                            : null,
                    },
                });

                // Update account object
                account.accessToken = credentials.access_token;
                account.tokenExpiresAt = credentials.expiry_date
                    ? new Date(credentials.expiry_date)
                    : null;

                this.logger.log(`Token refreshed successfully for account ${account.id}`);
            } catch (error: any) {
                this.logger.error(`Failed to refresh token: ${error.message}`);
                throw new BadRequestException(
                    'Token expired and refresh failed. Please reconnect your Google Ads account.',
                );
            }
        }
    }

    /**
     * Fetch campaigns from Google Ads API
     */
    async fetchCampaigns(account: any) {
        if (!account || !account.refreshToken) {
            throw new Error('Google Ads account not found or not connected');
        }

        await this.refreshTokenIfNeeded(account);

        const customer = this.googleAdsClientService.getCustomer(
            account.customerId,
            account.refreshToken,
        );

        const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr
      FROM campaign
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
      ORDER BY campaign.id
    `;

        try {
            const results = await customer.query(query);
            return results;
        } catch (error: any) {
            this.logger.error(`Google Ads API Error: ${error.message}`);
            throw new Error(`Failed to fetch campaigns: ${error.message}`);
        }
    }

    /**
     * Fetch campaign metrics from Google Ads API
     */
    async fetchCampaignMetrics(
        account: any,
        campaignId: string,
        startDate: Date,
        endDate: Date,
    ) {
        if (!account.refreshToken) {
            throw new BadRequestException('Account not authenticated. Please reconnect your Google Ads account.');
        }

        await this.refreshTokenIfNeeded(account);

        try {
            const customer = this.googleAdsClientService.getCustomer(
                account.customerId,
                account.refreshToken,
            );

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            const metrics = await customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE
          campaign.id = ${campaignId}
          AND campaign.status != 'REMOVED'
          AND segments.date >= '${startDateStr}'
          AND segments.date <= '${endDateStr}'
        ORDER BY segments.date ASC
      `);

            this.logger.log(`Fetched ${metrics.length} metric records`);
            return metrics;
        } catch (error: any) {
            this.handleApiError(error, account.id, campaignId);
            return []; // Should not reach here due to throw in handleApiError
        }
    }

    private handleApiError(error: any, accountId: string, campaignId: string) {
        this.logger.error('Raw Google Ads API Error:', JSON.stringify(error, null, 2));

        let errorMessage = 'Unknown error';
        let errorCode = null;

        if (error) {
            if (typeof error === 'string') {
                errorMessage = error;
            } else if (error.message) {
                errorMessage = error.message;
            } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
                errorMessage = error.errors.map((e: any) => e.message).join(', ');
                errorCode = error.errors[0].errorCode;
            } else if (error.toString && error.toString() !== '[object Object]') {
                errorMessage = error.toString();
            }

            errorCode = errorCode || error.code || error.status || null;

            if (errorMessage === 'invalid_grant') {
                errorMessage = 'Token expired or invalid. Please reconnect your Google Ads account.';
                this.logger.warn(`Token expired for account ${accountId}. User needs to reconnect.`);
            } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
                errorMessage = 'Permission denied. Please check account access permissions.';
            } else if (errorMessage.includes('developer_token')) {
                errorMessage = 'Invalid developer token. Please check GOOGLE_ADS_DEVELOPER_TOKEN.';
            } else if (errorMessage.includes('customer_id')) {
                errorMessage = 'Invalid customer ID. Please check customer ID format.';
            }
        }

        const descriptiveError = new Error(`Failed to fetch metrics: ${errorMessage}`);
        (descriptiveError as any).code = errorCode;
        (descriptiveError as any).originalError = error;
        throw descriptiveError;
    }
}
