import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAdsSyncService } from './google-ads-sync.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { GoogleAdsApiService } from './google-ads-api.service';
import { GoogleAdsMapperService } from './google-ads-mapper.service';
import { MockDataSeederService } from '../../../dashboard/mock-data-seeder.service';
import { NotFoundException } from '@nestjs/common';

describe('GoogleAdsSyncService', () => {
    let service: GoogleAdsSyncService;
    let prismaService: PrismaService;
    let apiService: GoogleAdsApiService;
    let mapperService: GoogleAdsMapperService;

    const mockPrismaService = {
        googleAdsAccount: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        campaign: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        metric: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    };

    const mockApiService = {
        fetchCampaigns: jest.fn(),
        fetchCampaignMetrics: jest.fn(),
    };

    const mockMapperService = {
        transformCampaigns: jest.fn(),
        transformMetrics: jest.fn(),
    };

    const mockSeederService = {
        seedCampaignMetrics: jest.fn().mockResolvedValue({ createdCount: 5 }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoogleAdsSyncService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: GoogleAdsApiService, useValue: mockApiService },
                { provide: GoogleAdsMapperService, useValue: mockMapperService },
                { provide: MockDataSeederService, useValue: mockSeederService },
            ],
        }).compile();

        service = module.get<GoogleAdsSyncService>(GoogleAdsSyncService);
        prismaService = module.get<PrismaService>(PrismaService);
        apiService = module.get<GoogleAdsApiService>(GoogleAdsApiService);
        mapperService = module.get<GoogleAdsMapperService>(GoogleAdsMapperService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('syncCampaigns', () => {
        it('should sync campaigns successfully', async () => {
            const mockAccount = { id: 'acc-1', tenantId: 'tenant-1' };
            mockPrismaService.googleAdsAccount.findUnique.mockResolvedValue(mockAccount);
            mockApiService.fetchCampaigns.mockResolvedValue([]);
            mockMapperService.transformCampaigns.mockReturnValue([
                { externalId: '1', name: 'Camp 1', status: 'ACTIVE' },
            ]);
            mockPrismaService.campaign.findFirst.mockResolvedValue(null); // New campaign
            mockPrismaService.campaign.create.mockResolvedValue({ id: 'c-1' });

            // Mock syncAllCampaignMetrics to avoid actual execution
            jest.spyOn(service, 'syncAllCampaignMetrics').mockResolvedValue({} as any);

            const result = await service.syncCampaigns('acc-1');

            expect(result.createdCount).toBe(1);
            expect(mockPrismaService.campaign.create).toHaveBeenCalled();
        });

        it('should throw error if account not found', async () => {
            mockPrismaService.googleAdsAccount.findUnique.mockResolvedValue(null);
            await expect(service.syncCampaigns('acc-1')).rejects.toThrow('Google Ads account not found');
        });
    });

    describe('syncCampaignMetrics', () => {
        it('should sync metrics successfully', async () => {
            const mockCampaign = { id: 'c-1', externalId: 'ext-1' };
            const mockAccount = { id: 'acc-1' };

            mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
            mockPrismaService.googleAdsAccount.findUnique.mockResolvedValue(mockAccount);
            mockApiService.fetchCampaignMetrics.mockResolvedValue([]);
            mockMapperService.transformMetrics.mockReturnValue([
                { date: new Date(), impressions: 100, clicks: 10 },
            ]);
            mockPrismaService.metric.findFirst.mockResolvedValue(null); // New metric

            const result = await service.syncCampaignMetrics('acc-1', 'c-1');

            expect(result.success).toBe(true);
            expect(result.syncedCount).toBe(1);
            expect(mockPrismaService.metric.create).toHaveBeenCalled();
        });

        it('should seed mock data if no real metrics found', async () => {
            const mockCampaign = { id: 'c-1', externalId: 'ext-1' };
            const mockAccount = { id: 'acc-1' };

            mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
            mockPrismaService.googleAdsAccount.findUnique.mockResolvedValue(mockAccount);
            mockApiService.fetchCampaignMetrics.mockResolvedValue([]);
            mockMapperService.transformMetrics.mockReturnValue([]); // Empty metrics

            const result = await service.syncCampaignMetrics('acc-1', 'c-1');

            expect(mockSeederService.seedCampaignMetrics).toHaveBeenCalled();
            expect(result.createdCount).toBe(5);
        });
    });
});
