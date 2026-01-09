import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { GoogleAdsApiService } from '../src/modules/integrations/google-ads/services/google-ads-api.service';

describe('Google Ads Integration (E2E)', () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let apiService: GoogleAdsApiService;

    const mockApiService = {
        fetchCampaigns: jest.fn().mockResolvedValue([
            {
                campaign: { id: 1, name: 'E2E Test Campaign', status: 2 },
                metrics: { clicks: 100, impressions: 1000 },
            },
        ]),
        fetchCampaignMetrics: jest.fn().mockResolvedValue([
            {
                segments: { date: '2023-01-01' },
                campaign: { id: 1, name: 'E2E Test Campaign' },
                metrics: { clicks: 10, impressions: 100 },
            },
        ]),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(GoogleAdsApiService)
            .useValue(mockApiService)
            .compile();

        app = moduleFixture.createNestApplication();
        prismaService = app.get<PrismaService>(PrismaService);
        apiService = app.get<GoogleAdsApiService>(GoogleAdsApiService);

        await app.init();
    });

    afterAll(async () => {
        await prismaService.$disconnect();
        await app.close();
    });

    it('/api/v1/integrations/google-ads/status (GET)', () => {
        return request(app.getHttpServer())
            .get('/api/v1/integrations/google-ads/status')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('isConnected');
            });
    });

    // Note: This test requires a valid JWT token which is hard to mock in E2E without full auth flow.
    // For now, we verify the public/protected status endpoints.

    it('should be defined', () => {
        expect(app).toBeDefined();
        expect(prismaService).toBeDefined();
        expect(apiService).toBeDefined();
    });
});
