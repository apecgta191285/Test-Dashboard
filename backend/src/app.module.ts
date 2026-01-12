import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GoogleAdsModule } from './modules/integrations/google-ads/google-ads.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';

import { SyncModule } from './modules/sync/sync.module';
import { FacebookAdsModule } from './modules/integrations/facebook/facebook-ads.module';
import { GoogleAnalyticsModule } from './modules/integrations/google-analytics/google-analytics.module';
import { TikTokAdsModule } from './modules/integrations/tiktok/tiktok-ads.module';
import { LineAdsModule } from './modules/integrations/line-ads/line-ads.module';
import { AlertModule } from './modules/alerts/alert.module';
import { HealthModule } from './modules/health/health.module';
import { MockDataModule } from './modules/mock-data/mock-data.module';
import { NotificationModule } from './modules/notification/notification.module';
import { envValidationSchema } from './config/env.validation';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get<number>('CACHE_TTL', 600000), // Default 10 mins
        max: configService.get<number>('CACHE_MAX', 100),
      }),
      inject: [ConfigService],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        } : undefined,
        autoLogging: true,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl: config.get<number>('THROTTLE_TTL', 60000),
        limit: config.get<number>('THROTTLE_LIMIT', 100),
      }]),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    DashboardModule,
    GoogleAdsModule,
    AuditLogsModule,
    GoogleAnalyticsModule,
    SyncModule,
    FacebookAdsModule,
    TikTokAdsModule,
    LineAdsModule,
    AlertModule, // Alert System
    HealthModule, // Health Check
    MockDataModule, // Mock Data Seeding
    NotificationModule, // Notification System (Sprint 4)
    CommonModule, // Shared Services (Encryption, etc.)
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }

