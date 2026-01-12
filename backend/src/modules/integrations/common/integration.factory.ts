import { Injectable, NotImplementedException } from '@nestjs/common';
import { MarketingPlatformAdapter } from './marketing-platform.adapter';
import { GoogleAdsService } from '../google-ads/google-ads.service';
import { FacebookAdsService } from '../facebook/facebook-ads.service';
import { GoogleAnalyticsAdapterService } from '../google-analytics/google-analytics-adapter.service';
import { TikTokAdsService } from '../tiktok/tiktok-ads.service';
import { LineAdsAdapterService } from '../line-ads/line-ads-adapter.service';
import { AdPlatform } from '@prisma/client';

@Injectable()
export class IntegrationFactory {
    constructor(
        private readonly googleAdsService: GoogleAdsService,
        private readonly facebookAdsService: FacebookAdsService,
        private readonly googleAnalyticsAdapterService: GoogleAnalyticsAdapterService,
        private readonly tiktokAdsService: TikTokAdsService,
        private readonly lineAdsAdapterService: LineAdsAdapterService,
    ) { }

    getAdapter(platform: string | AdPlatform): MarketingPlatformAdapter {
        // Normalize input to uppercase to match Enum keys
        const normalizedPlatform = typeof platform === 'string'
            ? platform.toUpperCase()
            : platform;

        switch (normalizedPlatform) {
            case AdPlatform.GOOGLE_ADS:
            case 'GOOGLE_ADS':
                return this.googleAdsService;
            case AdPlatform.FACEBOOK:
            case 'FACEBOOK':
                return this.facebookAdsService;
            case AdPlatform.GOOGLE_ANALYTICS:
            case 'GOOGLE_ANALYTICS':
                return this.googleAnalyticsAdapterService;
            case AdPlatform.TIKTOK:
            case 'TIKTOK':
                return this.tiktokAdsService;
            case AdPlatform.LINE_ADS:
            case 'LINE_ADS':
                return this.lineAdsAdapterService;
            default:
                throw new NotImplementedException(`Platform ${platform} not supported`);
        }
    }
}
