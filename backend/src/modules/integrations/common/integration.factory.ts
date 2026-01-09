import { Injectable, NotImplementedException } from '@nestjs/common';
import { MarketingPlatformAdapter } from './marketing-platform.adapter';
import { GoogleAdsService } from '../google-ads/google-ads.service';
import { FacebookAdsService } from '../facebook/facebook-ads.service';
import { GoogleAnalyticsAdapterService } from '../google-analytics/google-analytics-adapter.service';
import { TikTokAdsService } from '../tiktok/tiktok-ads.service';
import { LineAdsAdapterService } from '../line-ads/line-ads-adapter.service';
import { PlatformType } from '../../../common/enums/platform-type.enum';

@Injectable()
export class IntegrationFactory {
    constructor(
        private readonly googleAdsService: GoogleAdsService,
        private readonly facebookAdsService: FacebookAdsService,
        private readonly googleAnalyticsAdapterService: GoogleAnalyticsAdapterService,
        private readonly tiktokAdsService: TikTokAdsService,
        private readonly lineAdsAdapterService: LineAdsAdapterService,
    ) { }

    getAdapter(platform: string): MarketingPlatformAdapter {
        // Normalize input to uppercase to match Enum keys
        const normalizedPlatform = platform.toUpperCase();

        switch (normalizedPlatform) {
            case PlatformType.GOOGLE_ADS:
                return this.googleAdsService;
            case PlatformType.FACEBOOK:
                return this.facebookAdsService;
            case PlatformType.GOOGLE_ANALYTICS:
                return this.googleAnalyticsAdapterService;
            case PlatformType.TIKTOK:
                return this.tiktokAdsService;
            case PlatformType.LINE_ADS:
                return this.lineAdsAdapterService;
            default:
                throw new NotImplementedException(`Platform ${platform} not supported`);
        }
    }
}
