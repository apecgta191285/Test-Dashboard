import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { EncryptionService } from '../../../common/services/encryption.service';

@Injectable()
export class LineAdsOAuthService {
    private readonly logger = new Logger(LineAdsOAuthService.name);
    private readonly channelId: string;
    private readonly channelSecret: string;
    private readonly redirectUri: string;
    private readonly authBaseUrl = 'https://access.line.me/oauth2/v2.1';

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly encryptionService: EncryptionService,
    ) {
        this.channelId = this.configService.get('LINE_CHANNEL_ID');
        this.channelSecret = this.configService.get('LINE_CHANNEL_SECRET');
        this.redirectUri = this.configService.get('LINE_CALLBACK_URL');

        this.logger.log(`[LINE Ads OAuth] Initialized with Channel ID: ${this.channelId}, Redirect URI: ${this.redirectUri}`);
    }

    generateAuthUrl(userId: string, tenantId: string): string {
        const state = Buffer.from(
            JSON.stringify({ userId, tenantId, timestamp: Date.now() }),
        ).toString('base64');

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.channelId,
            redirect_uri: this.redirectUri,
            state: state,
            scope: 'profile openid',
        });

        return `${this.authBaseUrl}/authorize?${params.toString()}`;
    }

    async handleCallback(code: string, state: string) {
        try {
            // 1. Verify State
            const stateData = JSON.parse(
                Buffer.from(state, 'base64').toString('utf-8'),
            );
            const { tenantId } = stateData;

            // 2. Exchange Code for Token
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('redirect_uri', this.redirectUri);
            params.append('client_id', this.channelId);
            params.append('client_secret', this.channelSecret);

            const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const { access_token, refresh_token, id_token } = tokenResponse.data;

            // 3. Get User Profile (to use as Account Name)
            const profileResponse = await axios.get('https://api.line.me/v2/profile', {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            const { userId: lineUserId, displayName } = profileResponse.data;

            // 4. Save/Update Account
            const existing = await this.prisma.lineAdsAccount.findUnique({
                where: {
                    tenantId_channelId: {
                        tenantId,
                        channelId: lineUserId,
                    },
                },
            });

            if (existing) {
                await this.prisma.lineAdsAccount.update({
                    where: { id: existing.id },
                    data: {
                        accessToken: this.encryptionService.encrypt(access_token),
                        channelName: displayName,
                        status: 'ACTIVE',
                        updatedAt: new Date(),
                    },
                });
            } else {
                await this.prisma.lineAdsAccount.create({
                    data: {
                        tenantId,
                        channelId: lineUserId,
                        channelName: displayName,
                        accessToken: this.encryptionService.encrypt(access_token),
                        status: 'ACTIVE',
                    },
                });
            }

            return { success: true };

        } catch (error) {
            this.logger.error(`LINE Ads Callback Error: ${error.message}`);
            throw new BadRequestException(`Failed to connect LINE Ads: ${error.message}`);
        }
    }
}
