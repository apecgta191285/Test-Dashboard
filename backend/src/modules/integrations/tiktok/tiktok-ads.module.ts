import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { TikTokAdsService } from './tiktok-ads.service';
import { TikTokAdsOAuthService } from './tiktok-ads-oauth.service';
import { TikTokAdsController } from './tiktok-ads.controller';
import { TikTokAdsIntegrationController } from './tiktok-ads-integration.controller';

@Module({
    imports: [ConfigModule, PrismaModule],
    providers: [TikTokAdsService, TikTokAdsOAuthService],
    controllers: [TikTokAdsController, TikTokAdsIntegrationController],
    exports: [TikTokAdsService],
})
export class TikTokAdsModule { }
