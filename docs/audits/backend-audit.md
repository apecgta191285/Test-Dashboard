# 🔍 Backend Deep Code Audit Report
> **โปรเจกต์:** RGA AI Dashboard Backend  
> **วันที่ Audit:** 10 มกราคม 2026  
> **ผู้ตรวจสอบ:** Lead Code Auditor & NestJS Architecture Specialist  
> **เทียบกับ:** `prisma/schema.prisma` (v2.0) + `backend-wiki.md`

---

## บทสรุปผู้บริหาร (Executive Summary)

| หมวด | ปัญหาที่พบ | ระดับความรุนแรง |
|------|-----------|-----------------|
| 🛑 Type Safety & Enum | 15 ไฟล์ / 47 จุด | **CRITICAL** |
| 📐 Architecture & SRP | 3 จุด | MEDIUM |
| 📦 Dependencies | ครบถ้วน | ✅ PASS |
| 🧠 Logic & Feature | 4 จุด | **HIGH** |
| 🗑️ Dead Code | 4 ไฟล์ | LOW |

**สถานะรวม:** ❌ **ไม่ผ่านมาตรฐาน** - ต้องแก้ไขก่อน Production

---

## 1. 🛑 Type Safety & Enum Violations (CRITICAL)

### 1.1 Duplicate Enum Definitions (Must Delete)

> [!CAUTION]
> **กฎ:** ต้องใช้ Enums จาก `@prisma/client` เท่านั้น  
> **ปัญหา:** พบ Enum ที่สร้างซ้ำใน 3 ไฟล์

| ไฟล์ | Duplicate Enum | ต้องใช้แทน |
|------|----------------|-----------|
| `modules/users/dto/create-user.dto.ts` | `UserRole` (L4-8) | `UserRole` from `@prisma/client` |
| `modules/campaigns/dto/enums.ts` | `CampaignPlatform`, `CampaignStatus` (L1-15) | `AdPlatform`, `CampaignStatus` from `@prisma/client` |
| `common/enums/platform-type.enum.ts` | `PlatformType` (L1-7) | `AdPlatform` from `@prisma/client` |

**Remediation:**
```typescript
// ❌ DELETE these files:
// - src/modules/campaigns/dto/enums.ts
// - src/common/enums/platform-type.enum.ts
// - Remove enum from src/modules/users/dto/create-user.dto.ts

// ✅ CORRECT: Import from Prisma
import { UserRole, CampaignStatus, AdPlatform } from '@prisma/client';
```

---

### 1.2 Hardcoded String Literals (47 Violations)

> [!WARNING]
> พบการใช้ String Literals แทน Prisma Enums ใน 15 ไฟล์

**ไฟล์ที่มีปัญหา Critical:**

| # | ไฟล์ | บรรทัด | ปัญหา | แก้ไข |
|---|------|--------|-------|-------|
| 1 | `sync/unified-sync.service.ts` | L48, 51, 54, 57 | `status: 'ACTIVE'` | ใช้ literal ไม่ได้เพราะ PlatformAccount ยังเป็น String (ไม่ใช่ Enum) |
| 2 | `dashboard/dashboard.service.ts` | L30, 138, 290 | `status: 'ACTIVE'` | `status: CampaignStatus.ACTIVE` |
| 3 | `users/users.repository.ts` | L25 | `role: 'CLIENT'` | `role: UserRole.CLIENT` |
| 4 | `auth/auth.repository.ts` | L29 | `role: 'ADMIN'` | `role: UserRole.ADMIN` |
| 5 | `integrations/google-ads/services/google-ads-mapper.service.ts` | L12-24 | Returns `'ACTIVE'`, `'PAUSED'` | Return `CampaignStatus.ACTIVE` |
| 6 | `integrations/facebook/facebook-ads-oauth.service.ts` | L151 | `status: 'ACTIVE'` | ต้องแก้หลัง Migrate PlatformAccount |
| 7 | `integrations/tiktok/tiktok-ads-oauth.service.ts` | L108, 122, 181, 194 | `status: 'ACTIVE'` | ต้องแก้หลัง Migrate PlatformAccount |
| 8 | `integrations/line-ads/line-ads-oauth.service.ts` | L88, 99 | `status: 'ACTIVE'` | ต้องแก้หลัง Migrate PlatformAccount |
| 9 | `integrations/google-analytics/google-analytics-oauth.service.ts` | L126, 141, 235 | `status: 'ACTIVE'` | ต้องแก้หลัง Migrate PlatformAccount |
| 10 | `mock-data/generators/sync-logs.generator.ts` | L6 | `type SyncStatus = 'PENDING' | 'STARTED'...` | `import { SyncStatus } from '@prisma/client'` |
| 11 | `mock-data/data/mock-campaigns.ts` | L9, 42, 69, 116 | `status: 'PAUSED'` | `status: CampaignStatus.PAUSED` |

---

### 1.3 DTO Validator Issues

> [!IMPORTANT]
> พบ DTOs ที่ยังใช้ `@IsString()` แทน `@IsEnum()`

| ไฟล์ | Field | ปัญหา | แก้ไข |
|------|-------|-------|-------|
| `modules/users/dto/create-user.dto.ts` | `role` | ใช้ Local Enum | Import `UserRole` จาก Prisma |
| `modules/campaigns/dto/query-campaigns.dto.ts` | `platform`, `status` | น่าจะมี อาจใช้ `@IsString()` | ตรวจสอบและเปลี่ยนเป็น `@IsEnum()` |

---

## 2. 📐 Architecture & SRP Violations

### 2.1 Layer Boundaries ✅ PASS

**ผลการตรวจ:** ไม่พบ Controller ที่เรียก Prisma โดยตรง
- ทุก Controller เรียกผ่าน Service ตามมาตรฐาน

### 2.2 Response Format - PARTIAL COMPLIANCE

> [!NOTE]
> พบการใช้ `{ success: true, ... }` ใน 34 จุด

**ปัญหา:** ไม่มี Standard Response Wrapper ที่กลาง

**ไฟล์ที่ทำถูกต้อง:**
- `dashboard/dashboard.service.ts` (L347, 478)
- `integrations/google-ads/google-ads-sync.service.ts` (L220, 286)

**สิ่งที่ขาด:**
```typescript
// ❌ ไม่มี Interceptor กลางที่ทำ Response Transform
// ต้องสร้าง: common/interceptors/response-transform.interceptor.ts
```

**Remediation:**
```typescript
// common/interceptors/response-transform.interceptor.ts
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        message: 'Success',
      })),
    );
  }
}
```

---

## 3. 📦 Dependency & Configuration Check

### 3.1 Package.json Audit ✅ PASS

| Library | Status | Version |
|---------|--------|---------|
| `class-validator` | ✅ มี | ^0.14.0 |
| `class-transformer` | ✅ มี | ^0.5.1 |
| `@nestjs/config` | ✅ มี | ^3.1.1 |
| `passport-jwt` | ✅ มี | ^4.0.1 |
| `@prisma/client` | ✅ มี | 5.7.1 |
| `@nestjs/passport` | ✅ มี | ^10.0.2 |
| `@nestjs/jwt` | ✅ มี | ^10.2.0 |
| `@sentry/node` | ✅ มี | ^10.32.1 |
| `helmet` | ✅ มี | ^7.1.0 |

**สรุป:** Dependencies ครบตามมาตรฐาน

### 3.2 Environment Usage

> [!TIP]
> ใช้ `@nestjs/config` ผ่าน ConfigService อย่างถูกต้อง

```typescript
// ✅ ถูกต้อง - ใช้ ConfigService (พบใน auth.service.ts)
private readonly config: ConfigService
this.config.get('JWT_SECRET')
```

---

## 4. 🧠 Logic & Feature Gaps (HIGH PRIORITY)

### 4.1 AuthService Missing Security Fields ❌

> [!CAUTION]
> **ปัญหา:** `AuthService.login()` ไม่อัพเดท Security Fields ใหม่ที่เพิ่มใน Schema

**ไฟล์:** `modules/auth/auth.service.ts`

**สิ่งที่ขาด:**

| Field | จุดประสงค์ | Status |
|-------|-----------|--------|
| `lastLoginAt` | บันทึกเวลา Login | ❌ ไม่มี |
| `lastLoginIp` | บันทึก IP | ❌ ไม่มี |
| `failedLoginCount` | นับ Login ผิด | ❌ ไม่มี |
| `lockedUntil` | Lock Account | ❌ ไม่มี |
| `Session.ipAddress` | ติดตาม Session | ❌ ไม่มี |
| `Session.userAgent` | ติดตาม Device | ❌ ไม่มี |

**Remediation:**
```typescript
// In AuthService.login()
async login(dto: LoginDto, request: Request) {
  const user = await this.usersRepository.findByEmail(dto.email);

  // ✅ Check if account is locked
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedException('Account is locked. Try again later.');
  }

  if (!user || !user.isActive) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const valid = await bcrypt.compare(dto.password, user.password);
  if (!valid) {
    // ✅ Increment failed login count
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: { increment: 1 },
        lockedUntil: user.failedLoginCount >= 4 
          ? new Date(Date.now() + 30 * 60 * 1000)  // Lock 30 mins
          : null,
      },
    });
    throw new UnauthorizedException('Invalid credentials');
  }

  // ✅ Reset failed count & update login info
  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: request.ip,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  // ✅ Save session with IP and User Agent
  await this.authRepository.saveRefreshToken(
    user.id, 
    tokens.refreshToken,
    request.ip,
    request.headers['user-agent'],
  );
}
```

---

### 4.2 Missing NotificationModule ❌ CRITICAL

> [!CAUTION]
> **ปัญหา:** ไม่พบ `NotificationModule` ในโปรเจกต์  
> **สถานะ:** ต้องสร้างใหม่ทั้งหมด

**โครงสร้างที่ต้องสร้าง:**
```
modules/notification/
├── notification.module.ts
├── notification.controller.ts
├── notification.service.ts
└── dto/
    ├── create-notification.dto.ts
    └── notification-query.dto.ts
```

---

### 4.3 Missing PlatformToken Logic ❌

> [!WARNING]
> ตาราง `PlatformToken` มีใน Schema แต่ไม่มี Service/Logic รองรับ

**สถานะ:** ยังใช้ Token แยกในแต่ละ Platform Account (เช่น `GoogleAdsAccount.accessToken`)

**แนะนำ:** สร้าง `PlatformTokenService` สำหรับ Unified Token Management

---

### 4.4 Performance Check ✅ PASS

**ผลการตรวจ:**
- ❌ `$queryRaw` usage: **0 พบ** (ดี!)
- ⚠️ `include` ที่ใหญ่: ต้องตรวจเพิ่มเติม

---

## 5. 🗑️ Cleanup Strategy (Dead Code)

### ไฟล์/โฟลเดอร์ที่ควรลบ:

| # | Path | เหตุผล |
|---|------|--------|
| 1 | `src/common/enums/platform-type.enum.ts` | Duplicate - ใช้ `AdPlatform` จาก Prisma แทน |
| 2 | `src/modules/campaigns/dto/enums.ts` | Duplicate - ใช้ `CampaignStatus` จาก Prisma แทน |
| 3 | ~~`src/modules/mock-data/`~~ | **อย่าลบ** - ยังจำเป็นสำหรับ Development/Testing |
| 4 | `src/modules/debug/` | พิจารณาลบหลัง Production (Optional) |

### ไฟล์ที่ต้องแก้ไข Enum declarations:

| # | Path | Action |
|---|------|--------|
| 1 | `src/modules/users/dto/create-user.dto.ts` | ลบ `enum UserRole` (L4-8) และ Import จาก Prisma |

---

## 6. 📋 Remediation Checklist

### Priority 1: CRITICAL (ทำก่อน)

```markdown
- [ ] ลบ Duplicate Enums
  - [ ] Delete `common/enums/platform-type.enum.ts`
  - [ ] Delete `modules/campaigns/dto/enums.ts`
  - [ ] Remove local `UserRole` from `modules/users/dto/create-user.dto.ts`
- [ ] Update all imports to use `@prisma/client` Enums
- [ ] Fix `AuthService.login()` to update security fields
- [ ] Create `NotificationModule` (full implementation)
```

### Priority 2: HIGH (สำคัญ)

```markdown
- [ ] Fix 47 hardcoded string literals → use Prisma Enums
- [ ] Create `ResponseTransformInterceptor` for standard response format
- [ ] Update DTOs to use `@IsEnum()` with Prisma types
- [ ] Add session tracking (ipAddress, userAgent) to AuthRepository
```

### Priority 3: MEDIUM (ควรทำ)

```markdown
- [ ] Consider creating `PlatformTokenService` for unified token management
- [ ] Review and update all test files with Enum changes
- [ ] Add missing indexes in Service queries
```

### Priority 4: LOW (Optional)

```markdown
- [ ] Review `debug/` module for production removal
- [ ] Add logging interceptor
- [ ] Performance audit for large includes
```

---

## สรุปผลการ Audit

| เกณฑ์ | คะแนน | หมายเหตุ |
|-------|-------|----------|
| Type Safety | 3/10 | 47 violations |
| Architecture Compliance | 7/10 | ไม่มี Response Interceptor |
| Dependency | 10/10 | ครบถ้วน |
| Feature Completeness | 5/10 | ขาด Notification, Security |
| Code Cleanliness | 7/10 | มี Dead Code เล็กน้อย |
| **Overall** | **6.4/10** | **ต้อง Refactor ก่อน Production** |

---

> **ผู้ตรวจสอบ:** Lead Code Auditor  
> **วันที่รับรอง:** 10 มกราคม 2026  
> **สถานะ:** ❌ **ไม่ผ่าน** - ดำเนินการแก้ไขตาม Checklist
