import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import * as Sentry from '@sentry/node';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Load .env before anything else
dotenv.config();

async function bootstrap() {
  // Initialize Sentry (before app creation)
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV !== 'production',
    });
    console.log('🔴 Sentry initialized');
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://accounts.google.com'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS - Read from environment with fallback to development defaults
  const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:3000';
  const originList = corsOrigins.split(',').map(o => o.trim());

  app.enableCors({
    origin: [
      ...originList,
      /^https:\/\/.*\.manus-asia\.computer$/,
      /^https:\/\/.*\.manus\.space$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'health',
      'health/liveness',
      'health/readiness',
      'auth/google/ads/callback',
      'auth/google/analytics/callback',
      'auth/facebook/ads/callback',
      'auth/line/callback',
      'auth/tiktok/callback',
    ],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_TITLE || 'RGA Dashboard API')
    .setDescription(process.env.SWAGGER_DESCRIPTION || 'RGA Marketing Dashboard Backend API')
    .setVersion(process.env.SWAGGER_VERSION || '1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
