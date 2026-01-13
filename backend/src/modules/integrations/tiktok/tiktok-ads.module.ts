import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { TikTokAdsService } from './tiktok-ads.service';
import { TikTokAdsOAuthService } from './tiktok-ads-oauth.service';
import { TikTokAdsController } from './tiktok-ads.controller';
import { TikTokAdsIntegrationController } from './tiktok-ads-integration.controller';

/**
 * TikTok Ads Integration Module
 * 
 * Provides TikTok Ads OAuth and data fetching capabilities.
 * 
 * Dependencies:
 * - CacheModule (from AppModule - global)
 * - EncryptionService (from CommonModule - global)
 * - PrismaService (from PrismaModule)
 * - ConfigService (from ConfigModule)
 * 
 * Exports:
 * - TikTokAdsService: Implements MarketingPlatformAdapter for unified sync
 * - TikTokAdsOAuthService: Implements OAuthProvider for authentication
 * 
 * @see docs/plans/integration-spec-mapping.md
 */
@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        // Note: CacheModule is registered globally in AppModule
        // Note: EncryptionService is available globally from CommonModule
    ],
    controllers: [
        TikTokAdsController,
        TikTokAdsIntegrationController,
    ],
    providers: [
        TikTokAdsService,
        TikTokAdsOAuthService,
    ],
    exports: [
        TikTokAdsService,
        TikTokAdsOAuthService,
    ],
})
export class TikTokAdsModule { }
