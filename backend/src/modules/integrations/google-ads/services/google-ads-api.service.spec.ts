import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { GoogleAdsApiService } from './google-ads-api.service';
import { GoogleAdsClientService } from './google-ads-client.service';
import { BadRequestException } from '@nestjs/common';

describe('GoogleAdsApiService', () => {
    let service: GoogleAdsApiService;
    let prismaService: PrismaService;
    let googleAdsClientService: GoogleAdsClientService;

    const mockConfigService = {
        get: jest.fn((key: string) => {
            if (key === 'GOOGLE_CLIENT_ID') return 'mock-client-id';
            if (key === 'GOOGLE_CLIENT_SECRET') return 'mock-client-secret';
            return null;
        }),
    };

    const mockPrismaService = {
        googleAdsAccount: {
            update: jest.fn(),
        },
    };

    const mockGoogleAdsClientService = {
        getCustomer: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoogleAdsApiService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: GoogleAdsClientService, useValue: mockGoogleAdsClientService },
            ],
        }).compile();

        service = module.get<GoogleAdsApiService>(GoogleAdsApiService);
        prismaService = module.get<PrismaService>(PrismaService);
        googleAdsClientService = module.get<GoogleAdsClientService>(GoogleAdsClientService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('fetchCampaigns', () => {
        it('should fetch campaigns successfully', async () => {
            const mockAccount = {
                id: 'account-1',
                customerId: '1234567890',
                refreshToken: 'mock-refresh-token',
            };

            const mockCustomer = {
                query: jest.fn().mockResolvedValue([{ campaign: { id: 1, name: 'Test' } }]),
            };

            mockGoogleAdsClientService.getCustomer.mockReturnValue(mockCustomer);

            const result = await service.fetchCampaigns(mockAccount);

            expect(mockGoogleAdsClientService.getCustomer).toHaveBeenCalledWith(
                mockAccount.customerId,
                mockAccount.refreshToken,
            );
            expect(mockCustomer.query).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });

        it('should throw error if account has no refresh token', async () => {
            const mockAccount = { id: 'account-1' }; // No refresh token

            await expect(service.fetchCampaigns(mockAccount)).rejects.toThrow(
                'Google Ads account not found or not connected',
            );
        });
    });

    describe('fetchCampaignMetrics', () => {
        it('should fetch metrics successfully', async () => {
            const mockAccount = {
                id: 'account-1',
                customerId: '1234567890',
                refreshToken: 'mock-refresh-token',
                tokenExpiresAt: new Date(Date.now() + 3600000), // Valid token
            };

            const mockCustomer = {
                query: jest.fn().mockResolvedValue([{ metrics: { clicks: 10 } }]),
            };

            mockGoogleAdsClientService.getCustomer.mockReturnValue(mockCustomer);

            const result = await service.fetchCampaignMetrics(
                mockAccount,
                'campaign-1',
                new Date(),
                new Date(),
            );

            expect(result).toHaveLength(1);
        });

        it('should throw BadRequestException if no refresh token', async () => {
            const mockAccount = { id: 'account-1' };

            await expect(
                service.fetchCampaignMetrics(mockAccount, 'c-1', new Date(), new Date()),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
