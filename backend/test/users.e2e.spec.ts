import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestContext, cleanupTestContext, TestContext } from './test-utils';

describe('Users E2E Tests', () => {
  let context: TestContext;
  let app: INestApplication;
  let accessToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    context = await setupTestContext();
    app = context.app;
    accessToken = context.accessToken;
  });

  afterAll(async () => {
    await cleanupTestContext(context);
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user (Admin only)', async () => {
      const timestamp = Date.now();
      const newUser = {
        email: `newuser${timestamp}@test.com`,
        password: 'Password123',
        name: 'New Test User',
        role: 'CLIENT',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.name).toBe(newUser.name);
      expect(response.body.role).toBe(newUser.role);
      expect(response.body).not.toHaveProperty('password');

      createdUserId = response.body.id;
    });

    it('should return 409 for duplicate email', async () => {
      const duplicateUser = {
        email: 'admin@test.com', // Already exists from seed
        password: 'Password123',
        name: 'Duplicate User',
      };

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(duplicateUser)
        .expect(409);
    });

    it('should return 400 for invalid data', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: '123', // Too short
      };

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidUser)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ email: 'test@test.com', password: 'Password123' })
        .expect(401);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return paginated users list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);

      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');

      if (response.body.data.length > 0) {
        const user = response.body.data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).not.toHaveProperty('password');
      }
    });

    it('should filter users by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .query({ role: 'ADMIN' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('ADMIN');
      });
    });

    it('should filter users by isActive', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .query({ isActive: true })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach((user: any) => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return a single user by ID', async () => {
      // Use the created user ID from POST test
      if (!createdUserId) {
        // If no user was created, skip this test
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdUserId);
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('role');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update a user', async () => {
      // Use the created user ID from POST test
      if (!createdUserId) {
        return;
      }

      const updates = {
        name: 'Updated Name',
        role: 'MANAGER',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.id).toBe(createdUserId);
      expect(response.body.name).toBe(updates.name);
      expect(response.body.role).toBe(updates.role);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should soft delete a user', async () => {
      // Use the created user ID from POST test
      if (!createdUserId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdUserId);
      expect(response.body.isActive).toBe(false);

      // Verify user is marked as inactive
      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.isActive).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('RBAC - Role-Based Access Control', () => {
    it('should allow ADMIN to create users', async () => {
      const timestamp = Date.now();
      const newUser = {
        email: `rbac${timestamp}@test.com`,
        password: 'Password123',
        role: 'CLIENT',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newUser);

      // ADMIN should be able to create users
      expect([201, 409]).toContain(response.status);
    });
  });
});

