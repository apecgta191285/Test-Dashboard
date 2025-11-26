import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GoogleAdsModule } from './modules/integrations/google-ads/google-ads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    DashboardModule,
    GoogleAdsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

