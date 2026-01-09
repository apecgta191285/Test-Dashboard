import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { LineAdsAdapterService } from './line-ads-adapter.service';
import { LineAdsOAuthService } from './line-ads-oauth.service';
import { LineAdsController } from './line-ads.controller';
import { LineAdsIntegrationController } from './line-ads-integration.controller';

@Module({
    imports: [ConfigModule, PrismaModule],
    providers: [LineAdsAdapterService, LineAdsOAuthService],
    controllers: [LineAdsController, LineAdsIntegrationController],
    exports: [LineAdsAdapterService],
})
export class LineAdsModule { }
