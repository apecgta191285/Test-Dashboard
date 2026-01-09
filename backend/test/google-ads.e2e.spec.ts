import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestContext, cleanupTestContext, TestContext } from './test-utils';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Google Ads Integration E2E Tests', () => {
    let context: TestContext;
    let app: INestApplication;
    let accessToken: string;
    let prisma: PrismaService;
    let tenantId: string;

    beforeAll(async () => {
        context = await setupTestContext();
        app = context.app;
        accessToken = context.accessToken;
        prisma = app.get(PrismaService);

        // Get tenant ID from user
        const user = await prisma.user.findFirst();
        tenantId = user.tenantId;
    });

    afterAll(async () => {
        await cleanupTestContext(context);
    });

    describe('GET /integrations/google-ads/auth-url', () => {
        it('should return auth URL', async () => {
            const response = await request(app.getHttpServer())
                .get('/integrations/google-ads/auth-url')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('authUrl');
            expect(response.body.authUrl).toContain('accounts.google.com');
            expect(response.body).toHaveProperty('message');
        });

        it('should return 401 without authentication', async () => {
            await request(app.getHttpServer())
                .get('/integrations/google-ads/auth-url')
                .expect(401);
        });
    });

    describe('GET /integrations/google-ads/accounts', () => {
        it('should return empty list if no accounts connected', async () => {
            // Ensure no accounts exist for this tenant
            await prisma.googleAdsAccount.deleteMany({
                where: { tenantId },
            });

            const response = await request(app.getHttpServer())
                .get('/integrations/google-ads/accounts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('accounts');
            expect(Array.isArray(response.body.accounts)).toBe(true);
            expect(response.body.accounts.length).toBe(0);
        });

        it('should return connected accounts', async () => {
            // Create a dummy connected account
            await prisma.googleAdsAccount.create({
                data: {
                    tenantId,
                    customerId: '1234567890',
                    accountName: 'Test Account',
                    accessToken: 'test-access-token',
                    refreshToken: 'test-refresh-token',
                    status: 'ENABLED',
                },
            });

            const response = await request(app.getHttpServer())
                .get('/integrations/google-ads/accounts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.accounts.length).toBeGreaterThan(0);
            expect(response.body.accounts[0]).toHaveProperty('customerId', '1234567890');
            expect(response.body.accounts[0]).toHaveProperty('accountName', 'Test Account');
        });
    });

    describe('GET /integrations/google-ads/:accountId/campaigns/fetch', () => {
        let accountId: string;

        beforeAll(async () => {
            const account = await prisma.googleAdsAccount.findFirst({
                where: { tenantId },
            });
            accountId = account.id;
        });

        it('should return 400/500 if real API fails (expected in test env)', async () => {
            // Since we don't have real credentials, this is expected to fail with a specific error
            // or we might need to mock the service if we want to test success.
            // For now, let's just check that the endpoint is reachable and protected.

            await request(app.getHttpServer())
                .get(`/integrations/google-ads/${accountId}/campaigns/fetch`)
                .set('Authorization', `Bearer ${accessToken}`)
                // It might return 400 or 500 depending on how the error is handled when token is invalid
                // Based on our error handling updates, it should be 400 (BadRequest) or similar custom error
                .expect((res) => {
                    if (res.status !== 400 && res.status !== 500) throw new Error(`Expected 400 or 500, got ${res.status}`);
                });
        });
    });

    // We can't easily test sync without mocking the Google Ads API client
    // But we can verify the endpoint structure exists
});
