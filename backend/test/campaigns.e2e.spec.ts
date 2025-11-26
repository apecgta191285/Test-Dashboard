import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestContext, cleanupTestContext, TestContext } from './test-utils';

describe('Campaigns E2E Tests', () => {
  let context: TestContext;
  let app: INestApplication;
  let accessToken: string;
  let createdCampaignId: string;

  beforeAll(async () => {
    context = await setupTestContext();
    app = context.app;
    accessToken = context.accessToken;
  });

  afterAll(async () => {
    await cleanupTestContext(context);
  });

  describe('POST /api/v1/campaigns', () => {
    it('should create a new campaign', async () => {
      const timestamp = Date.now();
      const newCampaign = {
        name: `Test Campaign E2E ${timestamp}`,
        platform: 'GOOGLE_ADS',
        status: 'ACTIVE',
        budget: 10000,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        externalId: `test_e2e_${timestamp}`,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newCampaign)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newCampaign.name);
      expect(response.body.platform).toBe(newCampaign.platform);
      expect(response.body.status).toBe(newCampaign.status);
      expect(response.body.budget).toBe(newCampaign.budget);

      // Save campaign ID for later tests
      createdCampaignId = response.body.id;
    });

    it('should return 400 for invalid data', async () => {
      const invalidCampaign = {
        name: 'Test',
        // Missing required platform field
      };

      await request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidCampaign)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const newCampaign = {
        name: 'Test Campaign',
        platform: 'GOOGLE_ADS',
      };

      await request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .send(newCampaign)
        .expect(401);
    });
  });

  describe('GET /api/v1/campaigns', () => {
    it('should return paginated campaigns list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Check meta structure
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');

      // Check campaign structure if data exists
      if (response.body.data.length > 0) {
        const campaign = response.body.data[0];
        expect(campaign).toHaveProperty('id');
        expect(campaign).toHaveProperty('name');
        expect(campaign).toHaveProperty('platform');
        expect(campaign).toHaveProperty('status');
      }
    });

    it('should filter campaigns by platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/campaigns')
        .query({ platform: 'GOOGLE_ADS' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      
      // All campaigns should be GOOGLE_ADS
      response.body.data.forEach((campaign: any) => {
        expect(campaign.platform).toBe('GOOGLE_ADS');
      });
    });

    it('should filter campaigns by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/campaigns')
        .query({ status: 'ACTIVE' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      
      // All campaigns should be ACTIVE
      response.body.data.forEach((campaign: any) => {
        expect(campaign.status).toBe('ACTIVE');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/campaigns')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/v1/campaigns/:id', () => {
    it('should return a single campaign by ID', async () => {
      // Use the created campaign ID from POST test
      if (!createdCampaignId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/campaigns/${createdCampaignId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdCampaignId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('platform');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('metrics');
      expect(Array.isArray(response.body.metrics)).toBe(true);
    });

    it('should return 404 for non-existent campaign', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/campaigns/:id', () => {
    it('should update a campaign', async () => {
      // Use the created campaign ID from POST test
      if (!createdCampaignId) {
        return;
      }

      const updates = {
        budget: 15000,
        status: 'PAUSED',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/campaigns/${createdCampaignId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.id).toBe(createdCampaignId);
      expect(response.body.budget).toBe(updates.budget);
      expect(response.body.status).toBe(updates.status);
    });

    it('should return 404 for non-existent campaign', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ budget: 5000 })
        .expect(404);
    });
  });

  describe('GET /api/v1/campaigns/:id/metrics', () => {
    it('should return campaign metrics', async () => {
      // Get an existing campaign first
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`);
      
      const existingCampaignId = listResponse.body.data[0]?.id || createdCampaignId;
      
      const response = await request(app.getHttpServer())
        .get(`/api/v1/campaigns/${existingCampaignId}/metrics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('aggregated');
      expect(response.body).toHaveProperty('timeSeries');

      // Check aggregated metrics structure
      const aggregated = response.body.aggregated;
      expect(aggregated).toHaveProperty('totalImpressions');
      expect(aggregated).toHaveProperty('totalClicks');
      expect(aggregated).toHaveProperty('totalSpend');
      expect(aggregated).toHaveProperty('totalRevenue');
      expect(aggregated).toHaveProperty('totalConversions');
      expect(aggregated).toHaveProperty('avgCTR');
      expect(aggregated).toHaveProperty('avgCPC');
      expect(aggregated).toHaveProperty('roas');

      // Check timeSeries structure
      expect(Array.isArray(response.body.timeSeries)).toBe(true);
    });

    it('should filter metrics by date range', async () => {
      // Get an existing campaign first
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`);
      
      const existingCampaignId = listResponse.body.data[0]?.id || createdCampaignId;
      
      const response = await request(app.getHttpServer())
        .get(`/api/v1/campaigns/${existingCampaignId}/metrics`)
        .query({ startDate: '2024-01-01', endDate: '2024-12-31' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.dateRange.startDate).toContain('2024-01-01');
      expect(response.body.dateRange.endDate).toContain('2024-12-31');
    });

    it('should return 404 for non-existent campaign', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/campaigns/non-existent-id/metrics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/v1/campaigns/:id', () => {
    it('should soft delete a campaign', async () => {
      // Create a new campaign to delete
      const timestamp = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Campaign to Delete ${timestamp}`,
          platform: 'GOOGLE_ADS',
          status: 'ACTIVE',
          externalId: `delete_${timestamp}`,
        });
      
      const campaignToDelete = createResponse.body.id;
      
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/campaigns/${campaignToDelete}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(campaignToDelete);
      expect(response.body.status).toBe('ENDED');

      // Verify campaign is marked as ENDED
      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/campaigns/${campaignToDelete}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.status).toBe('ENDED');
    });

    it('should return 404 for non-existent campaign', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});

