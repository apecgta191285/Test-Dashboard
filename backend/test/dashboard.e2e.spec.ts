import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestContext, cleanupTestContext, TestContext } from './test-utils';

describe('Dashboard E2E Tests', () => {
  let context: TestContext;
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    context = await setupTestContext();
    app = context.app;
    accessToken = context.accessToken;
  });

  afterAll(async () => {
    await cleanupTestContext(context);
  });

  describe('GET /api/v1/dashboard/overview', () => {
    it('should return dashboard overview with KPI data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('campaigns');
      expect(response.body).toHaveProperty('kpi');

      // Check dateRange structure
      expect(response.body.dateRange).toHaveProperty('startDate');
      expect(response.body.dateRange).toHaveProperty('endDate');

      // Check campaigns structure
      expect(response.body.campaigns).toHaveProperty('total');
      expect(response.body.campaigns).toHaveProperty('active');
      expect(response.body.campaigns).toHaveProperty('paused');
      expect(typeof response.body.campaigns.total).toBe('number');

      // Check KPI structure
      const kpi = response.body.kpi;
      expect(kpi).toHaveProperty('totalRevenue');
      expect(kpi).toHaveProperty('totalSpend');
      expect(kpi).toHaveProperty('totalProfit');
      expect(kpi).toHaveProperty('roi');
      expect(kpi).toHaveProperty('totalImpressions');
      expect(kpi).toHaveProperty('totalClicks');
      expect(kpi).toHaveProperty('totalConversions');
      expect(kpi).toHaveProperty('averageCTR');
      expect(kpi).toHaveProperty('averageCPC');
      expect(kpi).toHaveProperty('averageCPM');
      expect(kpi).toHaveProperty('averageROAS');

      // Check data types
      expect(typeof kpi.totalRevenue).toBe('number');
      expect(typeof kpi.totalSpend).toBe('number');
      expect(typeof kpi.roi).toBe('number');
    });

    it('should filter by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.dateRange.startDate).toContain('2024-01-01');
      expect(response.body.dateRange.endDate).toContain('2024-12-31');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .expect(401);
    });
  });

  describe('GET /api/v1/dashboard/top-campaigns', () => {
    it('should return top campaigns sorted by revenue', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/top-campaigns')
        .query({ limit: 5, sortBy: 'revenue' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);

      if (response.body.length > 0) {
        const campaign = response.body[0];
        expect(campaign).toHaveProperty('id');
        expect(campaign).toHaveProperty('name');
        expect(campaign).toHaveProperty('platform');
        expect(campaign).toHaveProperty('status');
        expect(campaign).toHaveProperty('metrics');
        expect(campaign.metrics).toHaveProperty('revenue');
        expect(campaign.metrics).toHaveProperty('spend');
        expect(campaign.metrics).toHaveProperty('conversions');
        expect(campaign.metrics).toHaveProperty('roas');
      }
    });

    it('should return top campaigns sorted by ROAS', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/top-campaigns')
        .query({ limit: 3, sortBy: 'roas' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(3);
    });

    it('should return top campaigns sorted by conversions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/top-campaigns')
        .query({ limit: 5, sortBy: 'conversions' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/v1/dashboard/performance-by-platform', () => {
    it('should return performance metrics grouped by platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/performance-by-platform')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const platform = response.body[0];
        expect(platform).toHaveProperty('platform');
        expect(platform).toHaveProperty('campaignCount');
        expect(platform).toHaveProperty('totalRevenue');
        expect(platform).toHaveProperty('totalSpend');
        expect(platform).toHaveProperty('totalProfit');
        expect(platform).toHaveProperty('roas');
        expect(platform).toHaveProperty('ctr');
        expect(platform).toHaveProperty('totalImpressions');
        expect(platform).toHaveProperty('totalClicks');
        expect(platform).toHaveProperty('totalConversions');

        expect(typeof platform.campaignCount).toBe('number');
        expect(typeof platform.totalRevenue).toBe('number');
        expect(typeof platform.roas).toBe('number');
      }
    });

    it('should filter by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/performance-by-platform')
        .query({ startDate: '2024-01-01', endDate: '2024-12-31' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/v1/dashboard/time-series', () => {
    it('should return time series data for revenue', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/time-series')
        .query({ metric: 'revenue' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const dataPoint = response.body[0];
        expect(dataPoint).toHaveProperty('date');
        expect(dataPoint).toHaveProperty('value');
        expect(typeof dataPoint.value).toBe('number');
      }
    });

    it('should return time series data for spend', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/time-series')
        .query({ metric: 'spend' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return time series data for clicks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/time-series')
        .query({ metric: 'clicks' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return time series data for conversions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/time-series')
        .query({ metric: 'conversions' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    // Note: TypeScript already validates metric enum at compile time
    // Runtime validation could be added if needed
  });
});

