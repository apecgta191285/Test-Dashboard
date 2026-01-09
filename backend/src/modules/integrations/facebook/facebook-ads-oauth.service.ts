
import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { firstValueFrom } from 'rxjs';
import { EncryptionService } from '../../../common/services/encryption.service';

@Injectable()
export class FacebookAdsOAuthService {
    private readonly logger = new Logger(FacebookAdsOAuthService.name);
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly redirectUri: string;
    private readonly apiVersion = 'v18.0';

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,

        private readonly encryptionService: EncryptionService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        this.appId = this.configService.get<string>('FACEBOOK_APP_ID');
        this.appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');
        this.redirectUri = this.configService.get<string>('FACEBOOK_REDIRECT_URI');
    }

    async generateAuthUrl(userId: string, tenantId: string): Promise<string> {
        const state = uuidv4();
        // Cache state for validation
        await this.cacheManager.set(`fb_auth_state:${state}`, { userId, tenantId }, 600000); // 10 mins

        const scopes = ['ads_management', 'ads_read', 'read_insights'];

        const url = new URL(`https://www.facebook.com/${this.apiVersion}/dialog/oauth`);
        url.searchParams.append('client_id', this.appId);
        url.searchParams.append('redirect_uri', this.redirectUri);
        url.searchParams.append('state', state);
        url.searchParams.append('scope', scopes.join(','));
        url.searchParams.append('response_type', 'code');

        return url.toString();
    }

    async handleCallback(code: string, state: string) {
        // Validate state
        const storedState = await this.cacheManager.get<{ userId: string; tenantId: string }>(`fb_auth_state:${state}`);
        if (!storedState) {
            throw new BadRequestException('Invalid or expired state');
        }

        // Exchange code for access token
        const tokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
        const { data: tokenData } = await firstValueFrom(
            this.httpService.get(tokenUrl, {
                params: {
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    redirect_uri: this.redirectUri,
                    code,
                },
            }),
        );

        const shortLivedToken = tokenData.access_token;

        // Exchange for long-lived token
        const longLivedToken = await this.exchangeForLongLivedToken(shortLivedToken);

        // Get User's Ad Accounts
        const accounts = await this.getAdAccounts(longLivedToken);

        // Store temp token and accounts in cache for selection step
        const tempToken = uuidv4();
        await this.cacheManager.set(
            `fb_temp_token:${tempToken}`,
            {
                accessToken: longLivedToken,
                accounts,
                userId: storedState.userId,
                tenantId: storedState.tenantId,
            },
            600000,
        );

        return {
            status: 'success',
            tempToken,
        };
    }

    private async exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
        const url = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
        const { data } = await firstValueFrom(
            this.httpService.get(url, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    fb_exchange_token: shortLivedToken,
                },
            }),
        );
        return data.access_token;
    }

    private async getAdAccounts(accessToken: string) {
        const url = `https://graph.facebook.com/${this.apiVersion}/me/adaccounts`;
        const { data } = await firstValueFrom(
            this.httpService.get(url, {
                params: {
                    access_token: accessToken,
                    fields: 'account_id,name,account_status',
                },
            }),
        );
        return data.data;
    }

    async getTempAccounts(tempToken: string) {
        const data = await this.cacheManager.get<any>(`fb_temp_token:${tempToken}`);
        if (!data) {
            throw new BadRequestException('Invalid or expired temp token');
        }
        return data.accounts;
    }

    async completeConnection(tempToken: string, accountId: string, tenantId: string) {
        const data = await this.cacheManager.get<any>(`fb_temp_token:${tempToken}`);
        if (!data) {
            throw new BadRequestException('Invalid or expired temp token');
        }

        const selectedAccount = data.accounts.find((a: any) => a.account_id === accountId || a.id === accountId);
        if (!selectedAccount) {
            throw new BadRequestException('Invalid account selection');
        }

        // Save to database
        const account = await this.prisma.facebookAdsAccount.create({
            data: {
                tenantId,
                accountId: selectedAccount.account_id || selectedAccount.id, // Facebook returns act_<id> sometimes, or just id
                accountName: selectedAccount.name,
                accessToken: this.encryptionService.encrypt(data.accessToken),
                status: 'ACTIVE',
            },
        });

        await this.cacheManager.del(`fb_temp_token:${tempToken}`);

        return account;
    }

    async getConnectedAccounts(tenantId: string) {
        return this.prisma.facebookAdsAccount.findMany({
            where: { tenantId },
        });
    }
}
