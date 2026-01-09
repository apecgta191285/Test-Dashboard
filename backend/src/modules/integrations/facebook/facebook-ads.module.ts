import { Module } from '@nestjs/common';
import { FacebookAdsService } from './facebook-ads.service';
import { FacebookAdsAuthController } from './facebook-ads-auth.controller';
import { FacebookAdsOAuthService } from './facebook-ads-oauth.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [PrismaModule, ConfigModule, HttpModule],
    providers: [FacebookAdsService, FacebookAdsOAuthService],
    exports: [FacebookAdsService, FacebookAdsOAuthService],
    controllers: [FacebookAdsAuthController],
})
export class FacebookAdsModule { }
