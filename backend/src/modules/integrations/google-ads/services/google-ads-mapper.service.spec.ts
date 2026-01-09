import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAdsMapperService } from './google-ads-mapper.service';

describe('GoogleAdsMapperService', () => {
    let service: GoogleAdsMapperService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GoogleAdsMapperService],
        }).compile();

        service = module.get<GoogleAdsMapperService>(GoogleAdsMapperService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('mapCampaignStatus', () => {
        it('should map numeric status correctly', () => {
            expect(service.mapCampaignStatus(2)).toBe('ACTIVE');
            expect(service.mapCampaignStatus(3)).toBe('PAUSED');
            expect(service.mapCampaignStatus(4)).toBe('DELETED');
            expect(service.mapCampaignStatus(99)).toBe('UNKNOWN');
        });

        it('should map string status correctly', () => {
            expect(service.mapCampaignStatus('ENABLED')).toBe('ACTIVE');
            expect(service.mapCampaignStatus('PAUSED')).toBe('PAUSED');
            expect(service.mapCampaignStatus('REMOVED')).toBe('DELETED');
            expect(service.mapCampaignStatus('UNKNOWN_STATUS')).toBe('PAUSED'); // Default fallback
        });
    });

    describe('transformCampaigns', () => {
        it('should transform API results to internal format', () => {
            const apiResults = [
                {
                    campaign: {
                        id: 12345,
                        name: 'Test Campaign',
                        status: 2, // ENABLED
                        advertising_channel_type: 'SEARCH',
                    },
                    metrics: {
                        clicks: 100,
                        impressions: 1000,
                        cost_micros: 1000000, // 1.00
                        conversions: 5,
                        ctr: 0.1,
                    },
                },
            ];

            const result = service.transformCampaigns(apiResults);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                externalId: '12345',
                name: 'Test Campaign',
                status: 'ACTIVE',
                platform: 'GOOGLE_ADS',
                channelType: 'SEARCH',
                metrics: {
                    clicks: 100,
                    impressions: 1000,
                    cost: 1.0,
                    conversions: 5,
                    ctr: 0.1,
                },
                budget: 0,
            });
        });

        it('should handle missing metrics gracefully', () => {
            const apiResults = [
                {
                    campaign: {
                        id: 67890,
                        name: 'No Metrics Campaign',
                        status: 3, // PAUSED
                        advertising_channel_type: 'DISPLAY',
                    },
                    // metrics missing
                },
            ];

            const result = service.transformCampaigns(apiResults);

            expect(result[0].metrics).toEqual({
                clicks: 0,
                impressions: 0,
                cost: 0,
                conversions: 0,
                ctr: 0,
            });
        });
    });

    describe('transformMetrics', () => {
        it('should transform API metrics to internal format', () => {
            const apiMetrics = [
                {
                    segments: { date: '2023-01-01' },
                    campaign: { id: 123, name: 'Campaign 1' },
                    metrics: {
                        impressions: '1000',
                        clicks: '50',
                        cost_micros: 5000000, // 5.00
                        conversions: '2.5',
                        conversions_value: '100.0',
                        ctr: 0.05,
                        average_cpc: 100000, // 0.10
                    },
                },
            ];

            const result = service.transformMetrics(apiMetrics);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                date: new Date('2023-01-01'),
                campaignId: '123',
                campaignName: 'Campaign 1',
                impressions: 1000,
                clicks: 50,
                cost: 5.0,
                conversions: 2.5,
                conversionValue: 100.0,
                ctr: 5.0, // 0.05 * 100
                cpc: 0.1,
                cpm: 0,
            });
        });
    });
});
