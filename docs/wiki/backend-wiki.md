# Backend Architecture Wiki: RGA AI Dashboard
> **Version:** 2.0 (Sprint 4)  
> **Stack:** NestJS + Prisma + PostgreSQL  
> **Last Updated:** 2026-01-10

---

## ⚠️ ข้อบังคับสำหรับ Developer

> [!CAUTION]
> เอกสารนี้เป็น **กฎหมาย** ในการเขียนโค้ด  
> ทุก Pull Request ที่ไม่ปฏิบัติตามมาตรฐานในเอกสารนี้ **จะถูก Reject**

---

## 1. Modular Monolith Architecture 📐

### 1.1 Module Structure

```
src/
├── app.module.ts           # Root Module - Import ทุก Feature Module
├── main.ts                 # Application Entry Point
├── common/                 # 🔧 Shared Utilities (Cross-cutting Concerns)
│   ├── constants/          # Global Constants
│   ├── decorators/         # Custom Decorators (@CurrentUser, @Roles)
│   ├── enums/              # ⚠️ DEPRECATED - ใช้ @prisma/client แทน
│   ├── exceptions/         # Custom Exceptions
│   ├── filters/            # Exception Filters (Global Error Handler)
│   ├── guards/             # Auth Guards (JWT, Role)
│   ├── interceptors/       # Response Transform, Logging
│   ├── services/           # Shared Services (HttpService, etc.)
│   └── utils/              # Helper Functions
├── config/                 # 🔒 Configuration (Database, JWT, OAuth)
└── modules/                # 📦 Feature Modules (Domain-driven)
    ├── auth/               # Authentication & Authorization
    ├── users/              # User Management
    ├── campaigns/          # Campaign & Metrics
    ├── alerts/             # Alert Rules & Alerts
    ├── dashboard/          # Dashboard Aggregation
    ├── integrations/       # Platform Integrations (Google, Facebook, etc.)
    ├── sync/               # Data Synchronization
    ├── prisma/             # Database Service
    └── notification/       # 🆕 Notification System (Sprint 4)
```

---

### 1.2 Module Definitions (Domain-based)

| Module | Domain | Responsibility |
|--------|--------|----------------|
| `AuthModule` | Authentication | Login, Register, JWT, Refresh Token, Password Reset |
| `UsersModule` | User Management | CRUD Users, Profile, Preferences, Security Fields |
| `CampaignsModule` | Campaign | CRUD Campaigns, Metrics, Performance Data |
| `AlertsModule` | Alerting | Alert Rules, Alert Instances, Auto-trigger |
| `NotificationModule` | Notification | 🆕 Send/Read Notifications, Multi-channel Delivery |
| `DashboardModule` | Aggregation | KPI Summary, Charts Data, Cross-platform Stats |
| `IntegrationsModule` | Platform | Google/Facebook/TikTok/LINE OAuth & API |
| `SyncModule` | ETL | Data Sync, SyncLog, Scheduled Jobs |
| `PrismaModule` | Database | Database Service, Connection Management |

---

### 1.3 Layer Responsibilities (SRP)

```
┌─────────────────────────────────────────────────────────────┐
│                     REQUEST FLOW                            │
├─────────────────────────────────────────────────────────────┤
│  HTTP Request                                               │
│       ↓                                                     │
│  ┌─────────────┐                                            │
│  │  CONTROLLER │  • รับ Request                             │
│  │             │  • Validate DTO (class-validator)          │
│  │             │  • เรียก Service                           │
│  │             │  • ❌ ห้ามมี Business Logic                 │
│  │             │  • ❌ ห้ามเข้าถึง Database โดยตรง           │
│  └──────┬──────┘                                            │
│         ↓                                                   │
│  ┌─────────────┐                                            │
│  │   SERVICE   │  • Business Logic ทั้งหมดอยู่ที่นี่        │
│  │             │  • Validation Rules, Calculations          │
│  │             │  • เรียก Repository/Prisma                 │
│  │             │  • ❌ ห้ามแตะ HTTP (Request/Response)       │
│  │             │  • ❌ ห้าม throw HttpException              │
│  └──────┬──────┘                                            │
│         ↓                                                   │
│  ┌─────────────┐                                            │
│  │   PRISMA    │  • Database Access เท่านั้น                │
│  │   SERVICE   │  • Query, Create, Update, Delete           │
│  │             │  • Transaction Management                  │
│  │             │  • ❌ ห้ามมี Business Logic                 │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

---

### 1.4 File Naming Convention

```
modules/
└── campaigns/
    ├── campaigns.module.ts         # Module Definition
    ├── campaigns.controller.ts     # HTTP Handlers
    ├── campaigns.service.ts        # Business Logic
    ├── dto/
    │   ├── create-campaign.dto.ts  # Input Validation
    │   ├── update-campaign.dto.ts
    │   └── campaign-query.dto.ts
    ├── entities/
    │   └── campaign.entity.ts      # Response Types (ถ้าจำเป็น)
    └── campaigns.controller.spec.ts # Tests
```

---

## 2. Coding Standards & Principles 🛡️

### 2.1 Type Safety: Use Prisma Enums

> [!IMPORTANT]
> **บังคับ:** ใช้ Enums จาก `@prisma/client` เท่านั้น  
> **ห้าม:** สร้าง Enum ใหม่ใน `common/enums/` หรือใช้ String Literals

```typescript
// ✅ CORRECT - Import from Prisma
import { UserRole, CampaignStatus, AdPlatform } from '@prisma/client';

export class CreateCampaignDto {
  @IsEnum(CampaignStatus)
  status: CampaignStatus;

  @IsEnum(AdPlatform)
  platform: AdPlatform;
}

// ❌ WRONG - String Literal
export class CreateCampaignDto {
  @IsString()
  status: 'ACTIVE' | 'PAUSED';  // ❌ ห้ามใช้
}

// ❌ WRONG - Custom Enum
enum CampaignStatus {  // ❌ ห้ามสร้าง Enum ใหม่
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
}
```

**Available Enums from Prisma:**
| Enum | Values | Usage |
|------|--------|-------|
| `UserRole` | ADMIN, MANAGER, CLIENT, VIEWER | User permissions |
| `CampaignStatus` | ACTIVE, PAUSED, DELETED, PENDING, COMPLETED | Campaign state |
| `AdPlatform` | GOOGLE_ADS, FACEBOOK, TIKTOK, LINE_ADS, GOOGLE_ANALYTICS | Platform type |
| `AlertSeverity` | INFO, WARNING, CRITICAL | Alert level |
| `AlertStatus` | OPEN, ACKNOWLEDGED, RESOLVED | Alert state |
| `SyncStatus` | PENDING, STARTED, IN_PROGRESS, SUCCESS, COMPLETED, FAILED | Sync state |
| `NotificationChannel` | IN_APP, EMAIL, LINE, SMS | Notification channel |

---

### 2.2 DTO Pattern (Data Transfer Objects)

> [!IMPORTANT]
> **ทุก Request ต้องมี DTO class พร้อม Validators**

```typescript
// dto/create-notification.dto.ts
import { IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel = NotificationChannel.IN_APP;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
```

**Validation Rules:**
| Decorator | Use Case |
|-----------|----------|
| `@IsString()` | String fields |
| `@IsEnum(EnumType)` | Enum values |
| `@IsOptional()` | Nullable fields |
| `@IsNotEmpty()` | Required non-empty |
| `@IsDateString()` | ISO Date strings |
| `@IsObject()` | JSON objects |
| `@ValidateNested()` | Nested DTOs |

---

### 2.3 Standard Response Format

> [!IMPORTANT]
> **ทุก API Response ต้องใช้ Format นี้**

```typescript
// Standard Response Interface
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
```

**Response Examples:**

```typescript
// ✅ Success Response
{
  "success": true,
  "data": {
    "id": "clx123...",
    "title": "Campaign Created",
    "status": "ACTIVE"
  },
  "message": "Campaign created successfully"
}

// ✅ List Response with Pagination
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}

// ✅ Error Response
{
  "success": false,
  "data": null,
  "error": "CAMPAIGN_NOT_FOUND",
  "message": "Campaign with ID 'xyz' not found"
}
```

---

### 2.4 Error Handling (Global Exception Filter)

**Custom Exception Classes:**

```typescript
// common/exceptions/business.exception.ts
export class BusinessException extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
  }
}

// Usage in Service
throw new BusinessException(
  'CAMPAIGN_NOT_FOUND',
  `Campaign with ID '${id}' not found`,
  404
);
```

**Global Exception Filter:**

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    
    let status = 500;
    let error = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof BusinessException) {
      status = exception.statusCode;
      error = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      data: null,
      error,
      message,
    });
  }
}
```

---

### 2.5 DRY Principle (Don't Repeat Yourself)

**Shared Services:**
```typescript
// common/services/pagination.service.ts
export class PaginationService {
  static paginate<T>(data: T[], page: number, limit: number) {
    const start = (page - 1) * limit;
    return {
      data: data.slice(start, start + limit),
      meta: {
        total: data.length,
        page,
        limit,
      },
    };
  }
}
```

**Shared Decorators:**
```typescript
// common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Usage
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return this.usersService.findById(user.id);
}
```

---

## 3. Key Implementation Details 🧠

### 3.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────┐    POST /auth/login     ┌───────────────┐        │
│  │Client│ ──────────────────────> │ AuthController│        │
│  └──────┘    { email, password }  └───────┬───────┘        │
│                                           │                 │
│                                           ▼                 │
│                                   ┌───────────────┐        │
│                                   │  AuthService  │        │
│                                   │  • validateUser()       │
│                                   │  • checkLocked()        │
│                                   │  • generateTokens()     │
│                                   └───────┬───────┘        │
│                                           │                 │
│                                           ▼                 │
│  ┌──────┐    { accessToken,       ┌───────────────┐        │
│  │Client│ <────────────────────── │    Response   │        │
│  └──────┘      refreshToken }     └───────────────┘        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                 PROTECTED ROUTE ACCESS                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────┐    GET /api/campaigns   ┌───────────────┐        │
│  │Client│ ──────────────────────> │   JwtGuard    │        │
│  └──────┘    Authorization: Bearer└───────┬───────┘        │
│                                           │                 │
│                          ┌────────────────┼────────────────┐│
│                          │ Valid Token?   │                ││
│                          │    YES ────────┼──> Controller  ││
│                          │    NO  ────────┼──> 401 Error   ││
│                          └────────────────┴────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**JWT Guard Implementation:**

```typescript
// common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
```

**Refresh Token Strategy:**

```typescript
// modules/auth/auth.service.ts
async refreshTokens(refreshToken: string) {
  // 1. Find session by refresh token
  const session = await this.prisma.session.findUnique({
    where: { refreshToken },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new BusinessException('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 401);
  }

  // 2. Generate new tokens
  const tokens = this.generateTokens(session.user);

  // 3. Update session
  await this.prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return tokens;
}
```

**Security Field Updates:**

```typescript
// Update on successful login
await this.prisma.user.update({
  where: { id: user.id },
  data: {
    lastLoginAt: new Date(),
    lastLoginIp: request.ip,
    failedLoginCount: 0,  // Reset on success
  },
});

// Update on failed login
await this.prisma.user.update({
  where: { id: user.id },
  data: {
    failedLoginCount: { increment: 1 },
    lockedUntil: failedCount >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null,
  },
});
```

---

### 3.2 Notification System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 NOTIFICATION SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TRIGGERS                        NOTIFICATION SERVICE       │
│  ┌────────────┐                  ┌─────────────────┐       │
│  │ AlertService│ ───────────────>│                 │       │
│  │ (CTR < 2%) │   triggerAlert() │ NotificationSvc │       │
│  └────────────┘                  │                 │       │
│                                  │  • create()     │       │
│  ┌────────────┐                  │  • send()       │       │
│  │ SyncService│ ───────────────>│  • markAsRead() │       │
│  │ (Complete) │   notifyComplete()│  • dismiss()   │       │
│  └────────────┘                  │                 │       │
│                                  └────────┬────────┘       │
│  ┌────────────┐                           │                │
│  │ReportService│ ───────────────>         │                │
│  │ (Ready)    │   notifyReportReady()     │                │
│  └────────────┘                           ▼                │
│                                  ┌─────────────────┐       │
│                                  │  DELIVERY       │       │
│                                  │  • IN_APP (DB)  │       │
│                                  │  • EMAIL        │       │
│                                  │  • LINE         │       │
│                                  └─────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**NotificationService Implementation:**

```typescript
// modules/notification/notification.service.ts
@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,  // Optional
  ) {}

  /**
   * Create and optionally send a notification
   */
  async create(dto: CreateNotificationDto, sendImmediately = true) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        channel: dto.channel || NotificationChannel.IN_APP,
        priority: dto.priority || 'NORMAL',
        metadata: dto.metadata,
        alertId: dto.alertId,
        campaignId: dto.campaignId,
      },
    });

    if (sendImmediately && dto.channel !== NotificationChannel.IN_APP) {
      await this.send(notification);
    }

    return notification;
  }

  /**
   * Trigger notification from Alert
   */
  async triggerFromAlert(alert: Alert) {
    const users = await this.prisma.user.findMany({
      where: { tenantId: alert.tenantId, isActive: true },
    });

    for (const user of users) {
      await this.create({
        tenantId: alert.tenantId,
        userId: user.id,
        type: 'ALERT',
        title: alert.title,
        message: alert.message,
        channel: NotificationChannel.IN_APP,
        alertId: alert.id,
        metadata: {
          alertType: alert.type,
          severity: alert.severity,
          actionUrl: `/dashboard/alerts/${alert.id}`,
          actionText: 'ดูรายละเอียด',
        },
      });
    }
  }

  /**
   * Get unread notifications for user
   */
  async getUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
```

---

### 3.3 Prisma Data Access Rules

> [!IMPORTANT]
> **กฎการใช้ Prisma ที่ต้องปฏิบัติตาม**

**Rule 1: Always use `select` for Performance**

```typescript
// ✅ CORRECT - Select only needed fields
const campaigns = await this.prisma.campaign.findMany({
  where: { tenantId },
  select: {
    id: true,
    name: true,
    status: true,
    platform: true,
    // Don't select unnecessary relations
  },
});

// ❌ WRONG - Select all (heavy)
const campaigns = await this.prisma.campaign.findMany({
  where: { tenantId },
  include: { metrics: true, alerts: true },  // Too heavy!
});
```

**Rule 2: Avoid `$queryRaw` unless absolutely necessary**

```typescript
// ✅ CORRECT - Use Prisma Query Builder
const stats = await this.prisma.metric.aggregate({
  where: { campaign: { tenantId } },
  _sum: { impressions: true, clicks: true, spend: true },
});

// ❌ WRONG - Raw SQL (avoid unless complex)
const stats = await this.prisma.$queryRaw`
  SELECT SUM(impressions), SUM(clicks) FROM metrics...
`;
```

**Rule 3: Always include `tenantId` in queries (Multi-tenant)**

```typescript
// ✅ CORRECT - Multi-tenant safe
async findAll(tenantId: string) {
  return this.prisma.campaign.findMany({
    where: { tenantId },  // Always filter by tenant
  });
}

// ❌ WRONG - Data leak risk
async findAll() {
  return this.prisma.campaign.findMany();  // Exposes all tenants!
}
```

**Rule 4: Use Transactions for related operations**

```typescript
// ✅ CORRECT - Transaction for atomic operations
async createCampaignWithMetrics(data: CreateCampaignDto) {
  return this.prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({ data: ... });
    await tx.metric.create({ data: { campaignId: campaign.id, ... } });
    return campaign;
  });
}
```

---

## 4. Module Implementation Checklist

### For New Modules:

```markdown
- [ ] Create `module-name.module.ts`
- [ ] Create `module-name.controller.ts`
- [ ] Create `module-name.service.ts`
- [ ] Create `dto/` folder with Request DTOs
- [ ] Add Validators (`class-validator`) to all DTOs
- [ ] Use Prisma Enums (not string literals)
- [ ] Implement standard response format
- [ ] Add to `app.module.ts` imports
- [ ] Write unit tests (`.spec.ts`)
```

### NotificationModule Checklist (Sprint 4):

```markdown
- [ ] notification.module.ts
- [ ] notification.controller.ts
  - [ ] GET /notifications (list for user)
  - [ ] GET /notifications/unread (unread count)
  - [ ] POST /notifications (create - internal)
  - [ ] PATCH /notifications/:id/read
  - [ ] PATCH /notifications/:id/dismiss
- [ ] notification.service.ts
  - [ ] create()
  - [ ] triggerFromAlert()
  - [ ] getUnread()
  - [ ] markAsRead()
  - [ ] dismiss()
- [ ] dto/
  - [ ] create-notification.dto.ts
  - [ ] notification-query.dto.ts
```

---

## Appendix: Quick Reference

### Import Cheat Sheet

```typescript
// Prisma Enums
import {
  UserRole,
  CampaignStatus,
  AdPlatform,
  AlertSeverity,
  AlertStatus,
  SyncStatus,
  NotificationChannel,
} from '@prisma/client';

// Decorators
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

// Guards
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';

// Exceptions
import { BusinessException } from '@common/exceptions/business.exception';
```

---

> **Document Owner:** Senior Backend Architect  
> **Enforcement:** All Code Reviews  
> **Violations:** PR will be rejected
