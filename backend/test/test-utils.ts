import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

export interface TestContext {
  app: INestApplication;
  accessToken: string;
  userId: string;
  tenantId: string;
  moduleRef?: TestingModule;
}

export async function createTestApp(): Promise<{ app: INestApplication; moduleRef: TestingModule }> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  
  // Apply same configuration as main.ts
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();
  return { app, moduleRef: moduleFixture };
}

export async function loginTestUser(app: INestApplication): Promise<{ accessToken: string; userId: string; tenantId: string }> {
  // Use existing test user (created by seed)
  const loginResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@test.com',
      password: 'password123',
    });

  if (!loginResponse.body || !loginResponse.body.user) {
    throw new Error('Login failed: ' + JSON.stringify(loginResponse.body));
  }

  return {
    accessToken: loginResponse.body.accessToken,
    userId: loginResponse.body.user.id,
    tenantId: loginResponse.body.user.tenant.id,
  };
}

export async function setupTestContext(): Promise<TestContext> {
  const { app, moduleRef } = await createTestApp();
  const { accessToken, userId, tenantId } = await loginTestUser(app);
  
  return {
    app,
    accessToken,
    userId,
    tenantId,
    moduleRef,
  };
}

export async function cleanupTestContext(context: TestContext | undefined): Promise<void> {
  if (!context) {
    return;
  }
  
  if (context.app) {
    await context.app.close();
  }
  if (context.moduleRef) {
    await context.moduleRef.close();
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}

