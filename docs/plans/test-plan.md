# 📋 RGA Dashboard v2.0.0 - Comprehensive Test Plan
> **Sprint 4 Post-Refactor QA Sign-off Document**  
> **Lead QA:** Lead QA Engineer & Test Automation Specialist  
> **Version:** 2.0.0  
> **Date:** 2026-01-12  

---

## 📑 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Test Scope](#test-scope)
3. [Automated Backend Tests (Jest)](#-automated-backend-tests-jest)
4. [Manual UAT Checklist](#-manual-user-acceptance-tests-uat)
5. [Edge Cases & Stress Tests](#-edge-cases--stress-tests)
6. [Test Execution Commands](#-test-execution-commands)
7. [Sign-off Criteria](#-sign-off-criteria)

---

## Executive Summary

This test plan covers all **new features from Sprint 4** including:
- 🔒 **Security Hardening:** Account Lockout, Token Rotation, IP Tracking
- 🔔 **Notification System:** Multi-channel notifications (IN_APP, EMAIL, LINE, SMS)
- 📊 **Enum Standardization:** Prisma Enums across DB ↔ Backend ↔ Frontend
- ⚡ **State Management:** Zustand migration, Token Refresh Interceptor

> [!IMPORTANT]
> **All tests MUST pass before production deployment.**

---

## Test Scope

| Layer | Coverage | Test Type |
|-------|----------|-----------|
| **Database** | Prisma migrations, Enum constraints | Manual verification |
| **Backend API** | Auth, Notification, Enum validation | Automated (Jest) |
| **Frontend UI** | Login flow, Notification Bell, Badge display | Manual UAT + Playwright |
| **Integration** | Full-stack scenarios | E2E Automated |

---

## 🤖 Automated Backend Tests (Jest)

### Test File Locations

```
backend/
├── src/
│   └── modules/
│       ├── auth/                           # Auth tests needed
│       │   └── auth.service.spec.ts        # 🆕 To be created
│       └── notification/                   # Notification tests needed
│           └── notification.service.spec.ts # 🆕 To be created
└── test/
    ├── campaigns.e2e.spec.ts    ✅ Existing
    ├── dashboard.e2e.spec.ts    ✅ Existing
    ├── users.e2e.spec.ts        ✅ Existing
    └── auth.e2e.spec.ts         🆕 To be created
```

---

### 🔐 Auth Module Test Cases

#### File: `backend/src/modules/auth/auth.service.spec.ts`

| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| AUTH-001 | Login with valid credentials | Return `accessToken` + `refreshToken` + user data | 🔴 Critical |
| AUTH-002 | Login with wrong password | Return 401 + increment `failedLoginCount` | 🔴 Critical |
| AUTH-003 | Login with non-existent email | Return 401 + generic error message | 🟡 High |
| AUTH-004 | Login attempt #5 (wrong password) | Return 423 + `lockedUntil` timestamp | 🔴 Critical |
| AUTH-005 | Login while account locked | Return 423 + remaining lockout duration | 🔴 Critical |
| AUTH-006 | Login after lockout expires | Allow login + reset `failedLoginCount` | 🔴 Critical |
| AUTH-007 | Token refresh with valid token | Return new `accessToken` + rotated `refreshToken` | 🔴 Critical |
| AUTH-008 | Token refresh with expired token | Return 401 + `INVALID_REFRESH_TOKEN` | 🔴 Critical |
| AUTH-009 | Token refresh with invalid token | Return 401 + `INVALID_REFRESH_TOKEN` | 🟡 High |
| AUTH-010 | Successful login updates `lastLoginAt` | `lastLoginAt` field updated | 🟢 Medium |
| AUTH-011 | Successful login updates `lastLoginIp` | `lastLoginIp` field updated | 🟢 Medium |

#### Code Snippet: Auth Service Unit Test

```typescript
// backend/src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@rga.com',
    password: bcrypt.hashSync('correct-password', 10),
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: null,
    role: 'ADMIN',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            session: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('login', () => {
    // AUTH-001: Login success
    it('should return tokens on valid credentials', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser as any);

      const result = await service.login({
        email: 'test@rga.com',
        password: 'correct-password',
      }, '127.0.0.1');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginCount: 0 }),
        })
      );
    });

    // AUTH-002: Wrong password
    it('should throw 401 and increment failedLoginCount on wrong password', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        failedLoginCount: 1,
      } as any);

      await expect(
        service.login({ email: 'test@rga.com', password: 'wrong-password' }, '127.0.0.1')
      ).rejects.toThrow(UnauthorizedException);

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginCount: { increment: 1 } }),
        })
      );
    });

    // AUTH-004: Account lockout after 5 attempts
    it('should lock account after 5 failed attempts', async () => {
      const lockedUser = { ...mockUser, failedLoginCount: 4 };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(lockedUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...lockedUser,
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      } as any);

      await expect(
        service.login({ email: 'test@rga.com', password: 'wrong-password' }, '127.0.0.1')
      ).rejects.toThrow();

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lockedUntil: expect.any(Date),
          }),
        })
      );
    });

    // AUTH-005: Login while locked
    it('should reject login when account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // Locked for 10 more mins
      };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(lockedUser as any);

      await expect(
        service.login({ email: 'test@rga.com', password: 'correct-password' }, '127.0.0.1')
      ).rejects.toThrow();
    });
  });

  describe('refreshTokens', () => {
    // AUTH-007: Token refresh success
    it('should return new tokens on valid refresh token', async () => {
      const mockSession = {
        id: 'session-id',
        refreshToken: 'valid-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockUser,
      };
      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.session, 'update').mockResolvedValue({
        ...mockSession,
        refreshToken: 'new-refresh-token',
      } as any);

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    // AUTH-008: Expired refresh token
    it('should throw 401 on expired refresh token', async () => {
      const expiredSession = {
        id: 'session-id',
        refreshToken: 'expired-refresh-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: mockUser,
      };
      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(expiredSession as any);

      await expect(service.refreshTokens('expired-refresh-token')).rejects.toThrow();
    });
  });
});
```

---

### 🔔 Notification Module Test Cases

#### File: `backend/src/modules/notification/notification.service.spec.ts`

| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| NOTIF-001 | Create IN_APP notification | Notification created with `isRead: false` | 🔴 Critical |
| NOTIF-002 | Create notification with metadata | Metadata stored as JSON | 🟡 High |
| NOTIF-003 | Get unread notifications for user | Return only `isRead: false` items | 🔴 Critical |
| NOTIF-004 | Mark notification as read | Update `isRead: true` + `readAt` timestamp | 🔴 Critical |
| NOTIF-005 | Mark all as read | All user notifications marked read | 🟡 High |
| NOTIF-006 | Dismiss notification | Update `isDismissed: true` | 🟢 Medium |
| NOTIF-007 | Get unread count | Return correct count of unread items | 🔴 Critical |
| NOTIF-008 | Create notification from Alert trigger | Notification linked to `alertId` | 🟡 High |

#### Code Snippet: Notification Service Unit Test

```typescript
// backend/src/modules/notification/notification.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let prismaService: PrismaService;

  const mockNotification = {
    id: 'notif-001',
    userId: 'user-001',
    tenantId: 'tenant-001',
    title: 'Test Alert',
    message: 'CTR dropped below threshold',
    channel: NotificationChannel.IN_APP,
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
    readAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    // NOTIF-001: Create notification
    it('should create notification with isRead: false', async () => {
      jest.spyOn(prismaService.notification, 'create').mockResolvedValue(mockNotification as any);

      const result = await service.create({
        userId: 'user-001',
        tenantId: 'tenant-001',
        title: 'Test Alert',
        message: 'CTR dropped below threshold',
        channel: NotificationChannel.IN_APP,
      });

      expect(result.isRead).toBe(false);
      expect(prismaService.notification.create).toHaveBeenCalled();
    });
  });

  describe('getUnread', () => {
    // NOTIF-003: Get unread notifications
    it('should return only unread notifications', async () => {
      jest.spyOn(prismaService.notification, 'findMany').mockResolvedValue([mockNotification] as any);

      const result = await service.getUnread('user-001');

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-001', isRead: false, isDismissed: false },
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('markAsRead', () => {
    // NOTIF-004: Mark as read
    it('should update isRead and readAt', async () => {
      jest.spyOn(prismaService.notification, 'update').mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      } as any);

      const result = await service.markAsRead('notif-001', 'user-001');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });
  });

  describe('getUnreadCount', () => {
    // NOTIF-007: Get unread count
    it('should return correct unread count', async () => {
      jest.spyOn(prismaService.notification, 'count').mockResolvedValue(5);

      const count = await service.getUnreadCount('user-001');

      expect(count).toBe(5);
    });
  });
});
```

---

## 👤 Manual User Acceptance Tests (UAT)

> [!TIP]
> **Instructions:** Complete each test case and mark ✅ Pass or ❌ Fail in the Result column.  
> Record any bugs in the Notes column with screenshot references.

### 🏠 Pre-requisites

| Step | Action | Expected |
|------|--------|----------|
| 1 | Start Backend: `cd backend && npm run start:dev` | Server running on `http://localhost:3000` |
| 2 | Start Frontend: `cd frontend && npm run dev` | App running on `http://localhost:5173` |
| 3 | Ensure database seeded with test user | `test@rga.com` / `password123` available |

---

### 📋 UAT Checklist

#### Scenario 1: 🔐 Security - Account Lockout

| Step | Action | Expected Result | Result | Notes |
|------|--------|-----------------|--------|-------|
| 1.1 | Go to Login page | Login form visible | ⬜ | |
| 1.2 | Enter valid email + **wrong password** (attempt 1) | "Invalid credentials" error shown | ⬜ | |
| 1.3 | Repeat wrong password (attempt 2-4) | Error shown each time | ⬜ | |
| 1.4 | Enter wrong password (attempt **5**) | **"Account Locked"** message shown | ⬜ | |
| 1.5 | Verify lockout message shows unlock time | "Try again in XX minutes" displayed | ⬜ | |
| 1.6 | Try login with **correct password** while locked | Still shows locked message (403/423) | ⬜ | |
| 1.7 | Wait 15 minutes (or reset in DB) | Login allowed with correct password | ⬜ | |

**Manual Override (for testing):**
```sql
-- Reset lockout for testing
UPDATE "User" SET "failedLoginCount" = 0, "lockedUntil" = NULL WHERE email = 'test@rga.com';
```

---

#### Scenario 2: 🔔 Notification Bell

| Step | Action | Expected Result | Result | Notes |
|------|--------|-----------------|--------|-------|
| 2.1 | Login with valid credentials | Dashboard loaded | ⬜ | |
| 2.2 | Check notification bell icon in header | Bell icon visible | ⬜ | |
| 2.3 | Create test notification via API (see command below) | API returns 201 | ⬜ | |
| 2.4 | Wait 30 seconds OR refresh page | Badge with number appears on bell | ⬜ | |
| 2.5 | Click bell icon | Dropdown shows notification list | ⬜ | |
| 2.6 | Click on a notification | Notification marked as read, count decreases | ⬜ | |
| 2.7 | Click "Mark all as read" | All notifications marked read, badge disappears | ⬜ | |

**Create Test Notification (cURL):**
```bash
# Get access token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@rga.com","password":"password123"}' | jq -r '.data.accessToken')

# Create notification
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "USER_ID_HERE",
    "title": "🚨 CTR Alert",
    "message": "Campaign XYZ CTR dropped to 1.2%",
    "channel": "IN_APP",
    "metadata": {"severity": "WARNING", "campaignId": "123"}
  }'
```

---

#### Scenario 3: 📊 Enum Display - Campaign Status Badges

| Step | Action | Expected Result | Result | Notes |
|------|--------|-----------------|--------|-------|
| 3.1 | Navigate to Campaigns page | Campaign list visible | ⬜ | |
| 3.2 | Check campaign with `ACTIVE` status | 🟢 **Green** badge displayed | ⬜ | |
| 3.3 | Check campaign with `PAUSED` status | 🟡 **Yellow/Amber** badge displayed | ⬜ | |
| 3.4 | Check campaign with `DELETED` status | 🔴 **Red** badge displayed | ⬜ | |
| 3.5 | Check campaign with `PENDING` status | 🔵 **Blue/Gray** badge displayed | ⬜ | |
| 3.6 | Check campaign with `COMPLETED` status | ✅ **Green/Checkmark** badge displayed | ⬜ | |

**Badge Color Reference (from `enum-mappers.ts`):**

| Status | Expected Color | Icon |
|--------|---------------|------|
| `ACTIVE` | Green (`bg-green-500`) | Play/Circle |
| `PAUSED` | Yellow (`bg-yellow-500`) | Pause |
| `DELETED` | Red (`bg-red-500`) | Trash |
| `PENDING` | Gray (`bg-gray-400`) | Clock |
| `COMPLETED` | Teal/Green (`bg-teal-500`) | Check |

---

#### Scenario 4: 🔐 Token Refresh Flow

| Step | Action | Expected Result | Result | Notes |
|------|--------|-----------------|--------|-------|
| 4.1 | Login and note access token expiry | Token expires in ~15 min | ⬜ | |
| 4.2 | Wait for token to expire (or simulate) | Keep app open | ⬜ | |
| 4.3 | Perform any API action (e.g., refresh campaigns) | Request succeeds (auto-refresh) | ⬜ | |
| 4.4 | Check Network tab | See token refresh request before main request | ⬜ | |

**Simulate Token Expiry (for testing):**
1. Open Browser DevTools → Application → Local Storage
2. Modify `accessToken` to an expired/invalid value
3. Perform any action that triggers API call
4. Observe auto-refresh behavior

---

## 💣 Edge Cases & Stress Tests

> [!CAUTION]
> These tests are designed to find **breaking bugs** in extreme conditions.

### 🔴 Critical Edge Cases

| ID | Scenario | Test Steps | Expected Result |
|----|----------|------------|-----------------|
| EDGE-001 | **Token Expired During Form Submit** | 1. Open form (e.g., Create Campaign)<br>2. Wait for token to expire<br>3. Submit form | Form submits successfully after silent token refresh |
| EDGE-002 | **Rapid Fire Login Attempts** | Use script to send 10 login attempts in 1 second | After 5 failures, account locked; no race conditions |
| EDGE-003 | **Network Disconnect Mid-Request** | 1. Start long operation (e.g., sync)<br>2. Disable network<br>3. Re-enable | Graceful error message; no UI freeze |
| EDGE-004 | **Null/Undefined User Data** | User record with missing `lastLoginAt`, `role` | UI handles gracefully, no JS errors |
| EDGE-005 | **Concurrent Refresh Token Calls** | 3 API calls trigger 401 simultaneously | Only 1 refresh call made (queue mechanism) |
| EDGE-006 | **Session Hijacking Detection** | Login from different IP | (Future feature) Alert or block |
| EDGE-007 | **Notification Overflow** | Create 1000+ notifications for user | Pagination works, no performance degradation |
| EDGE-008 | **Invalid Enum Value from API** | Mock API returns `status: "UNKNOWN"` | Fallback to default badge/color |

### 🟡 Boundary Test Cases

| ID | Scenario | Input | Expected |
|----|----------|-------|----------|
| BOUND-001 | Password length max | 128+ characters | Validation error or accepted |
| BOUND-002 | Notification message max | 10,000 characters | Truncated display or scroll |
| BOUND-003 | Campaign name max | 500+ characters | Validation error |
| BOUND-004 | Date range 2+ years | Historical data query | Performance acceptable (<3s) |
| BOUND-005 | 100 campaigns on list | List with pagination | No infinite scroll lag |

---

## 🚀 Test Execution Commands

### Backend Tests

```bash
# Navigate to backend directory
cd backend

# Run all unit tests
npm run test

# Run tests with coverage report
npm run test:cov

# Run tests in watch mode (development)
npm run test:watch

# Run E2E tests only
npm run test:e2e

# Run specific test file
npm run test -- --testPathPattern="auth.service.spec.ts"

# Run with verbose output
npm run test -- --verbose
```

### Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Run Playwright E2E tests
npm run test:e2e

# Run Playwright with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test auth.spec.ts

# Run headed (visible browser)
npx playwright test --headed
```

### Full Test Suite (CI/CD)

```bash
# From project root
npm run test:all           # If script exists

# Or run sequentially
cd backend && npm run test && npm run test:e2e && cd ../frontend && npm run test:e2e
```

---

## ✅ Sign-off Criteria

### Automated Tests

| Criteria | Threshold | Actual | Status |
|----------|-----------|--------|--------|
| Unit Test Pass Rate | 100% | ⬜ __%  | ⬜ |
| E2E Test Pass Rate | 100% | ⬜ __%  | ⬜ |
| Code Coverage (Backend) | ≥80% | ⬜ __%  | ⬜ |
| Critical Path Coverage | 100% | ⬜ __%  | ⬜ |

### Manual UAT

| Criteria | Required | Actual | Status |
|----------|----------|--------|--------|
| Scenario 1 (Account Lockout) | ALL PASS | ⬜ /7 | ⬜ |
| Scenario 2 (Notification Bell) | ALL PASS | ⬜ /7 | ⬜ |
| Scenario 3 (Enum Badges) | ALL PASS | ⬜ /6 | ⬜ |
| Scenario 4 (Token Refresh) | ALL PASS | ⬜ /4 | ⬜ |

### Edge Cases

| Criteria | Required | Actual | Status |
|----------|----------|--------|--------|
| Critical Edge Cases | 6/8 PASS | ⬜ /8 | ⬜ |
| Boundary Tests | 4/5 PASS | ⬜ /5 | ⬜ |

---

## 📝 Final Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **QA Lead** | _____________ | _____________ | ____/____/2026 |
| **Backend Dev** | _____________ | _____________ | ____/____/2026 |
| **Frontend Dev** | _____________ | _____________ | ____/____/2026 |
| **Product Owner** | _____________ | _____________ | ____/____/2026 |

> [!IMPORTANT]
> **Deployment is BLOCKED until all sign-off criteria are met.**

---

*Generated by Lead QA Engineer | RGA Dashboard v2.0.0 Sprint 4*
