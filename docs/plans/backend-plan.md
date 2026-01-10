# 🔧 Backend Refactoring Master Plan
> **Version:** 1.0 | **Created:** 2026-01-10  
> **Target:** Refactor Backend to Sprint 4 Standards  
> **Reference:** [backend-audit.md](../audits/backend-audit.md) | [backend-wiki.md](../wiki/backend-wiki.md)

---

## ⚠️ Pre-Refactoring Checklist

> [!CAUTION]
> **อ่านและทำตาม Checklist นี้ก่อนเริ่มงาน!**

```bash
# 1. Create new branch
git checkout -b refactor/sprint4-backend

# 2. Ensure clean state
git status

# 3. Run current tests to establish baseline
npm run test

# 4. Build to ensure no existing errors
npm run build
```

**✅ Confirm before proceeding:**
- [ ] New branch created
- [ ] All tests passing (or documented failures)
- [ ] Build succeeds
- [ ] Team notified about refactoring

---

## Step 1: 🧹 Cleanup & Preparation

### 1.1 Delete Dead Code / Duplicate Enums

> [!IMPORTANT]
> **ลบไฟล์เหล่านี้ก่อน** เพื่อป้องกัน Import Conflicts

**Files to DELETE:**

```bash
# Run these commands in order
rm src/common/enums/platform-type.enum.ts
rm src/modules/campaigns/dto/enums.ts
```

| # | File Path | Reason |
|---|-----------|--------|
| 1 | `src/common/enums/platform-type.enum.ts` | Duplicate of `AdPlatform` from Prisma |
| 2 | `src/modules/campaigns/dto/enums.ts` | Duplicate of `CampaignStatus`, `AdPlatform` from Prisma |

---

### 1.2 Update Import Statements

**ทุกไฟล์ที่ Import Enum ต้องเปลี่ยนเป็น:**

```typescript
// ✅ CORRECT - Import from Prisma Client
import { 
  UserRole, 
  CampaignStatus, 
  AdPlatform,
  AlertSeverity,
  AlertStatus,
  SyncStatus,
  SyncType,
  NotificationChannel,
  AlertRuleType,
} from '@prisma/client';

// ❌ DELETE these imports
import { UserRole } from './create-user.dto';  // DELETE
import { CampaignPlatform, CampaignStatus } from './enums';  // DELETE
import { PlatformType } from '@common/enums/platform-type.enum';  // DELETE
```

**Files that need import updates:**

| # | File | Current Import | Change To |
|---|------|----------------|-----------|
| 1 | `modules/users/dto/create-user.dto.ts` | Local `UserRole` enum | `import { UserRole } from '@prisma/client'` |
| 2 | `modules/campaigns/dto/create-campaign.dto.ts` | `./enums` | `import { CampaignStatus, AdPlatform } from '@prisma/client'` |
| 3 | `modules/campaigns/dto/query-campaigns.dto.ts` | Check and fix | Use Prisma imports |
| 4 | `modules/sync/unified-sync.service.ts` | None (uses strings) | Add Prisma imports |
| 5 | `modules/dashboard/dashboard.service.ts` | None (uses strings) | Add Prisma imports |

---

### 1.3 Fix `create-user.dto.ts`

**Current (ต้องแก้):**
```typescript
// ❌ WRONG - Local enum definition
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CLIENT = 'CLIENT',
}
```

**Fixed Version (Replace entire file):**
```typescript
// src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsString, IsOptional, IsEnum, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';  // ✅ Import from Prisma

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole, example: 'CLIENT' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

---

## Step 2: 🛡️ Core Infrastructure

### 2.1 Create Response Transform Interceptor

**Create file:** `src/common/interceptors/response-transform.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data already has success property, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          data,
          message: 'Success',
        };
      }),
    );
  }
}
```

---

### 2.2 Create Global Exception Filter

**Create file:** `src/common/filters/global-exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Custom Business Exception
export class BusinessException extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'BusinessException';
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = null;

    // Handle BusinessException
    if (exception instanceof BusinessException) {
      status = exception.statusCode;
      errorCode = exception.code;
      message = exception.message;
    }
    // Handle HttpException (including all NestJS built-in exceptions)
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        errorCode = (exceptionResponse as any).error || 'HTTP_ERROR';
      } else {
        message = exceptionResponse as string;
      }
    }
    // Handle unknown errors
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    // Log error details
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      data: null,
      error: errorCode,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

### 2.3 Register in main.ts

**Update file:** `src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ✅ Global Response Interceptor
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // ... rest of your config
  await app.listen(3000);
}
bootstrap();
```

---

### 2.4 Update AuthService with Security Fields

**Update file:** `src/modules/auth/auth.service.ts`

**Add to login method:**

```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './auth.repository';
import { UsersRepository } from '../users/users.repository';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';  // ✅ ADD
import { RegisterDto, LoginDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { User, Tenant } from '@prisma/client';
import { Request } from 'express';  // ✅ ADD

type UserWithTenant = User & { tenant: Tenant };

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly prisma: PrismaService,  // ✅ ADD
  ) { }

  // ... register method stays the same

  /**
   * Login with Security Field Updates
   */
  async login(dto: LoginDto, request?: Request) {
    const user = await this.usersRepository.findByEmail(dto.email) as UserWithTenant;

    // ✅ Check if account is locked
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account is locked. Try again in ${minutesLeft} minutes.`
      );
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    
    if (!valid) {
      // ✅ Increment failed login count
      const newFailedCount = (user.failedLoginCount || 0) + 1;
      const shouldLock = newFailedCount >= 5;
      
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: newFailedCount,
          lockedUntil: shouldLock 
            ? new Date(Date.now() + 30 * 60 * 1000)  // Lock for 30 minutes
            : null,
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ Reset failed count & update login info on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: request?.ip || request?.socket?.remoteAddress || null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    
    // ✅ Save session with IP and User Agent
    await this.authRepository.saveRefreshToken(
      user.id, 
      tokens.refreshToken,
      request?.ip,
      request?.headers?.['user-agent'],
    );

    await this.auditLogsService.createLog({
      userId: user.id,
      action: 'LOGIN',
      resource: 'Auth',
      details: { 
        email: user.email,
        ip: request?.ip,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: { id: user.tenant.id, name: user.tenant.name },
      },
      ...tokens,
    };
  }

  // ... rest of methods
}
```

---

### 2.5 Update AuthRepository for Session Tracking

**Update file:** `src/modules/auth/auth.repository.ts`

```typescript
// Update saveRefreshToken method to include IP and UserAgent
async saveRefreshToken(
  userId: string, 
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string,
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  return this.prisma.session.create({
    data: {
      userId,
      refreshToken,
      expiresAt,
      ipAddress: ipAddress || null,    // ✅ NEW
      userAgent: userAgent || null,    // ✅ NEW
    },
  });
}
```

---

### 2.6 Update AuthController to Pass Request

**Update file:** `src/modules/auth/auth.controller.ts`

```typescript
import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, request);  // ✅ Pass request
  }

  // ... other methods
}
```

---

## Step 3: 📦 Module Refactoring

### 3.1 Create NotificationModule

**Create folder structure:**
```
src/modules/notification/
├── notification.module.ts
├── notification.controller.ts
├── notification.service.ts
└── dto/
    ├── create-notification.dto.ts
    └── notification-query.dto.ts
```

---

**File 1:** `src/modules/notification/dto/create-notification.dto.ts`

```typescript
import { IsString, IsEnum, IsOptional, IsNotEmpty, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'ALERT' })
  @IsString()
  @IsNotEmpty()
  type: string;  // ALERT, REPORT_READY, SYNC_COMPLETE, SYSTEM

  @ApiProperty({ example: 'Alert: Low ROAS Detected' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Campaign XYZ has ROAS below threshold' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ enum: NotificationChannel, default: 'IN_APP' })
  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel;

  @ApiPropertyOptional({ example: 'NORMAL' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ example: { actionUrl: '/alerts/123', actionText: 'View' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  alertId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campaignId?: string;
}

export class MarkAsReadDto {
  @ApiProperty()
  @IsBoolean()
  isRead: boolean;
}
```

---

**File 2:** `src/modules/notification/dto/notification-query.dto.ts`

```typescript
import { IsOptional, IsBoolean, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class NotificationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
```

---

**File 3:** `src/modules/notification/notification.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, NotificationQueryDto } from './dto';
import { NotificationChannel, Notification, Alert } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new notification
   */
  async create(tenantId: string, dto: CreateNotificationDto): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        tenantId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        channel: dto.channel || NotificationChannel.IN_APP,
        priority: dto.priority || 'NORMAL',
        metadata: dto.metadata || null,
        alertId: dto.alertId || null,
        campaignId: dto.campaignId || null,
      },
    });
  }

  /**
   * Trigger notifications from an Alert
   */
  async triggerFromAlert(alert: Alert): Promise<void> {
    // Get all active users in the tenant
    const users = await this.prisma.user.findMany({
      where: { tenantId: alert.tenantId, isActive: true },
      select: { id: true },
    });

    // Create notification for each user
    const notifications = users.map((user) => ({
      tenantId: alert.tenantId,
      userId: user.id,
      type: 'ALERT',
      title: alert.title,
      message: alert.message,
      channel: NotificationChannel.IN_APP,
      priority: alert.severity === 'CRITICAL' ? 'HIGH' : 'NORMAL',
      alertId: alert.id,
      metadata: {
        alertType: alert.type,
        severity: alert.severity,
        actionUrl: `/dashboard/alerts/${alert.id}`,
        actionText: 'ดูรายละเอียด',
      },
    }));

    await this.prisma.notification.createMany({ data: notifications });
  }

  /**
   * Get notifications for a user
   */
  async findAll(userId: string, query: NotificationQueryDto) {
    const { page = 1, limit = 20, isRead, type } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      isDismissed: false,
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    if (type) {
      where.type = type;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false, isDismissed: false },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { count: result.count };
  }

  /**
   * Dismiss notification
   */
  async dismiss(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isDismissed: true },
    });
  }
}
```

---

**File 4:** `src/modules/notification/notification.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateNotificationDto, NotificationQueryDto, MarkAsReadDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  async findAll(@Req() req: any, @Query() query: NotificationQueryDto) {
    return this.notificationService.findAll(req.user.sub, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.sub);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationService.markAsRead(id, req.user.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.sub);
  }

  @Patch(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss notification' })
  async dismiss(@Param('id') id: string, @Req() req: any) {
    return this.notificationService.dismiss(id, req.user.sub);
  }
}
```

---

**File 5:** `src/modules/notification/notification.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
```

---

### 3.2 Register NotificationModule in AppModule

**Update file:** `src/app.module.ts`

```typescript
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    // ... existing imports
    NotificationModule,  // ✅ ADD
  ],
})
export class AppModule {}
```

---

### 3.3 Fix Integration Services (String → Enum)

**Files to update:**

| # | File | Changes Needed |
|---|------|----------------|
| 1 | `integrations/google-ads/services/google-ads-mapper.service.ts` | Return `CampaignStatus` enum |
| 2 | `dashboard/dashboard.service.ts` | Use `CampaignStatus.ACTIVE` |
| 3 | `sync/unified-sync.service.ts` | Note: PlatformAccounts still use String status |

**Example fix for `google-ads-mapper.service.ts`:**

```typescript
import { Injectable } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';  // ✅ ADD

@Injectable()
export class GoogleAdsMapperService {
  /**
   * Map Google Ads campaign status to our CampaignStatus enum
   */
  mapCampaignStatus(googleStatus: string | number): CampaignStatus {
    // Handle numeric status codes
    if (typeof googleStatus === 'number') {
      switch (googleStatus) {
        case 2: return CampaignStatus.ACTIVE;     // ENABLED
        case 3: return CampaignStatus.PAUSED;     // PAUSED
        case 4: return CampaignStatus.DELETED;    // REMOVED
        default: return CampaignStatus.PAUSED;
      }
    }

    // Handle string status
    const statusMap: Record<string, CampaignStatus> = {
      'ENABLED': CampaignStatus.ACTIVE,
      'PAUSED': CampaignStatus.PAUSED,
      'REMOVED': CampaignStatus.DELETED,
    };

    return statusMap[googleStatus] || CampaignStatus.PAUSED;
  }
}
```

---

## Step 4: ✅ Verification Steps

### 4.1 Build & Lint Check

```bash
# 1. Format code
npm run format

# 2. Lint check
npm run lint

# 3. Build
npm run build

# 4. If build fails, check for import errors
```

### 4.2 Test Run

```bash
# 1. Run all tests
npm run test

# 2. Run specific module tests
npm run test -- --testPathPattern=notification
npm run test -- --testPathPattern=auth
```

### 4.3 Manual API Testing

```bash
# 1. Start dev server
npm run start:dev

# 2. Test login with security
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' 
# Repeat 5 times to test account locking

# 3. Test notifications
curl -X GET http://localhost:3000/notifications \
  -H "Authorization: Bearer <token>"
```

---

## Final Checklist ✔️

```markdown
## Step 1: Cleanup
- [ ] Delete `src/common/enums/platform-type.enum.ts`
- [ ] Delete `src/modules/campaigns/dto/enums.ts`
- [ ] Update `create-user.dto.ts` to import from Prisma

## Step 2: Infrastructure
- [ ] Create `ResponseTransformInterceptor`
- [ ] Create `GlobalExceptionFilter`
- [ ] Register in `main.ts`
- [ ] Update `AuthService.login()` with security fields
- [ ] Update `AuthRepository.saveRefreshToken()` with IP/UserAgent
- [ ] Update `AuthController` to pass Request

## Step 3: Modules
- [ ] Create `NotificationModule` (all 5 files)
- [ ] Register in `AppModule`
- [ ] Fix `GoogleAdsMapperService` to return Enum
- [ ] Fix `DashboardService` to use Enum

## Step 4: Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Login brute-force protection works
- [ ] Notifications API works
```

---

> **Plan Created by:** Technical Lead & Refactoring Specialist  
> **Estimated Time:** 4-6 hours  
> **Priority:** HIGH - Required for Sprint 4 Production
