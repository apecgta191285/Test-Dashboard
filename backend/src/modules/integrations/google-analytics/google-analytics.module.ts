import { Module, forwardRef } from '@nestjs/common';
import { GoogleAnalyticsService } from './google-analytics.service';
import { GoogleAnalyticsAuthController } from './google-analytics-auth.controller';
import { GoogleAnalyticsDataController } from './google-analytics-data.controller';
import { GoogleAnalyticsOAuthService } from './google-analytics-oauth.service';
import { GoogleAnalyticsApiService } from './google-analytics-api.service';
import { GoogleAnalyticsAdapterService } from './google-analytics-adapter.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { DashboardModule } from '../../dashboard/dashboard.module';
import { SyncModule } from '../../sync/sync.module';

@Module({
    imports: [
        PrismaModule,
        DashboardModule,
        ConfigModule,
        forwardRef(() => SyncModule),
    ],
    controllers: [GoogleAnalyticsAuthController, GoogleAnalyticsDataController],
    providers: [GoogleAnalyticsService, GoogleAnalyticsOAuthService, GoogleAnalyticsApiService, GoogleAnalyticsAdapterService],
    exports: [GoogleAnalyticsService, GoogleAnalyticsApiService, GoogleAnalyticsAdapterService],
})
export class GoogleAnalyticsModule { }
