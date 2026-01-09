import { Module, forwardRef } from '@nestjs/common';
import { SyncSchedulerService } from './sync-scheduler.service';
import { UnifiedSyncService } from './unified-sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { GoogleAnalyticsModule } from '../integrations/google-analytics/google-analytics.module';
import { GoogleAdsModule } from '../integrations/google-ads/google-ads.module';
import { FacebookAdsModule } from '../integrations/facebook/facebook-ads.module';
import { TikTokAdsModule } from '../integrations/tiktok/tiktok-ads.module';
import { LineAdsModule } from '../integrations/line-ads/line-ads.module';
import { IntegrationFactory } from '../integrations/common/integration.factory';

@Module({
    imports: [
        PrismaModule,
        ConfigModule,
        forwardRef(() => GoogleAnalyticsModule),
        forwardRef(() => GoogleAdsModule),
        FacebookAdsModule,
        TikTokAdsModule,
        LineAdsModule,
    ],
    providers: [
        SyncSchedulerService,
        UnifiedSyncService,
        IntegrationFactory,
    ],
    exports: [
        SyncSchedulerService,
        UnifiedSyncService,
    ],
})
export class SyncModule { }
