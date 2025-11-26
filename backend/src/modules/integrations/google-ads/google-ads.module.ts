import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoogleAdsOAuthController } from './google-ads-oauth.controller';
import { GoogleAdsOAuthService } from './google-ads-oauth.service';
import { GoogleAdsCampaignController } from './google-ads-campaign.controller';
import { GoogleAdsCampaignService } from './google-ads-campaign.service';
import { GoogleAdsClientService } from './services/google-ads-client.service';
import { GoogleAdsAuthService } from './services/google-ads-auth.service';
import { GoogleAdsIntegrationService } from './services/google-ads-integration.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [GoogleAdsOAuthController, GoogleAdsCampaignController],
  providers: [
    GoogleAdsOAuthService,
    GoogleAdsCampaignService,
    GoogleAdsClientService,
    GoogleAdsAuthService,
    GoogleAdsIntegrationService,
  ],
  exports: [
    GoogleAdsOAuthService,
    GoogleAdsCampaignService,
    GoogleAdsClientService,
    GoogleAdsAuthService,
    GoogleAdsIntegrationService,
  ],
})
export class GoogleAdsModule { }
