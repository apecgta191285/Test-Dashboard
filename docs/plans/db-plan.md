# 🚀 Database Migration Master Plan
> **Version:** 1.0 | **Created:** 2026-01-10  
> **Target:** Upgrade Schema from v1.2 (Sprint 3) → v2.0 (Sprint 4)  
> **Reference:** [db-audit.md](../audits/db-audit.md) | [database-wiki.md](../wiki/database-wiki.md)

---

## ⚠️ Pre-Migration Safety Checklist

> [!CAUTION]
> **อ่านและทำตาม Checklist นี้ก่อนเริ่มงาน!**

```bash
# 1. Backup Database (MANDATORY)
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. หรือใช้ Supabase Dashboard → Settings → Database → Backups → Create

# 3. ตรวจสอบว่าไม่มี Migration ที่ค้างอยู่
npx prisma migrate status

# 4. Pull schema ล่าสุด
git pull origin main
```

**✅ Confirm before proceeding:**
- [ ] Database backup created
- [ ] No pending migrations
- [ ] Local branch is up-to-date
- [ ] Team notified about schema changes

---

## 1. Pre-requisite: Enum Definitions 📋

> **ทำ Step นี้ก่อน!** เพราะ Steps อื่นๆ จะ reference ถึง Enums เหล่านี้

### 1.1 สร้าง Enums (เพิ่มที่ด้านบนของ schema.prisma ต่อจาก datasource)

```prisma
// ============================================
// ENUMS - Sprint 4 Type Safety
// ============================================

// User Roles: กำหนดระดับสิทธิ์การใช้งาน
enum UserRole {
  ADMIN       // ผู้ดูแลระบบ
  MANAGER     // ผู้จัดการ (จัดการ users ในทีม)
  CLIENT      // ลูกค้าทั่วไป
  VIEWER      // ดูอย่างเดียว (read-only)
}

// Campaign Status: สถานะของแคมเปญโฆษณา
enum CampaignStatus {
  ACTIVE      // กำลังทำงาน
  PAUSED      // หยุดชั่วคราว
  DELETED     // ถูกลบแล้ว
  PENDING     // รอดำเนินการ
  COMPLETED   // เสร็จสิ้นแล้ว
}

// Ad Platform: แพลตฟอร์มโฆษณาที่รองรับ
enum AdPlatform {
  GOOGLE_ADS
  FACEBOOK
  TIKTOK
  LINE_ADS
  GOOGLE_ANALYTICS
}

// Notification Channel: ช่องทางการแจ้งเตือน
enum NotificationChannel {
  IN_APP      // แจ้งเตือนในแอป
  EMAIL       // ส่งอีเมล
  LINE        // ส่งผ่าน LINE
  SMS         // ส่ง SMS
}

// Alert Severity: ระดับความรุนแรงของ Alert
enum AlertSeverity {
  INFO        // ข้อมูลทั่วไป
  WARNING     // เตือน
  CRITICAL    // วิกฤต
}

// Sync Status: สถานะการ Sync ข้อมูล
enum SyncStatus {
  PENDING       // รอดำเนินการ
  STARTED       // เริ่มแล้ว
  IN_PROGRESS   // กำลังดำเนินการ
  SUCCESS       // สำเร็จ
  COMPLETED     // เสร็จสมบูรณ์
  FAILED        // ล้มเหลว
}

// Alert Status: สถานะของ Alert
enum AlertStatus {
  OPEN          // เปิดอยู่
  ACKNOWLEDGED  // รับทราบแล้ว
  RESOLVED      // แก้ไขแล้ว
}

// Sync Type: ประเภทการ Sync
enum SyncType {
  INITIAL       // ครั้งแรก
  SCHEDULED     // ตามกำหนด
  MANUAL        // Manual
}

// Alert Rule Type: ประเภทกฎแจ้งเตือน
enum AlertRuleType {
  PRESET        // Preset จากระบบ
  CUSTOM        // กำหนดเอง
}
```

---

## 2. Execution Steps (ทำตามลำดับ!)

### Step 1: Security Core Update 🔐

**เป้าหมาย:** เพิ่ม Security Fields ใน User Model

**File:** `backend/prisma/schema.prisma`

**ค้นหา:**
```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  name      String?
  role      String    @default("CLIENT")
  isActive  Boolean   @default(true)
  tenantId  String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  sessions  Session[]
  tenant    Tenant    @relation(fields: [tenantId], references: [id])

  @@index([role])
  @@index([isActive])
}
```

**แทนที่ด้วย:**
```prisma
model User {
  id                      String    @id @default(cuid())
  email                   String    @unique
  password                String
  name                    String?
  role                    UserRole  @default(CLIENT)  // ⚡ String → UserRole
  isActive                Boolean   @default(true)
  tenantId                String
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  // 🔐 Security Enhancement (Sprint 4)
  lastLoginAt             DateTime?               // ครั้งสุดท้ายที่ login
  lastLoginIp             String?                 // IP Address ที่ login
  failedLoginCount        Int       @default(0)   // จำนวนครั้ง login ผิด
  lockedUntil             DateTime?               // ล็อค account จนถึง
  passwordChangedAt       DateTime?               // ครั้งสุดท้ายเปลี่ยนรหัส
  twoFactorEnabled        Boolean   @default(false)

  // 🔔 Notification & Preferences
  notificationPreferences Json?                   // { "email": true, "inApp": true }
  timezone                String?   @default("Asia/Bangkok")
  language                String?   @default("th")

  // Relations
  sessions                Session[]
  tenant                  Tenant    @relation(fields: [tenantId], references: [id])
  notifications           Notification[]          // ⚡ NEW relation

  @@index([role])
  @@index([isActive])
  @@index([tenantId, isActive])  // ⚡ NEW composite index
  @@index([email])               // ⚡ NEW for login lookup
}
```

**⚠️ Data Migration Note:**
```sql
-- หลังจาก prisma migrate ให้ run SQL นี้เพื่อแปลงค่า role เดิม
-- (Prisma จะจัดการให้อัตโนมัติถ้า default value ตรงกัน)
-- ถ้ามีปัญหา ให้ run:
UPDATE "User" SET role = 'CLIENT' WHERE role IS NULL;
```

---

### Step 2: Enum Migration (Campaign, Alert, SyncLog) 🔄

**เป้าหมาย:** แปลง String Fields → Enums

#### 2.1 Campaign Model

**ค้นหา:**
```prisma
model Campaign {
  id                   String              @id @default(cuid())
  name                 String
  platform             String
  status               String
  ...
  syncStatus           String?             @default("pending")
```

**แทนที่ field เหล่านี้ด้วย:**
```prisma
model Campaign {
  id                   String              @id @default(cuid())
  name                 String
  platform             AdPlatform          // ⚡ String → AdPlatform
  status               CampaignStatus      // ⚡ String → CampaignStatus
  budget               Float?
  startDate            DateTime?
  endDate              DateTime?
  externalId           String?
  googleAdsAccountId   String?
  facebookAdsAccountId String?
  tiktokAdsAccountId   String?
  lineAdsAccountId     String?
  lastSyncedAt         DateTime?
  syncStatus           SyncStatus?         @default(PENDING)  // ⚡ String → SyncStatus
  tenantId             String
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  // Relations (ไม่เปลี่ยน)
  lineAdsAccount       LineAdsAccount?     @relation(fields: [lineAdsAccountId], references: [id])
  tiktokAdsAccount     TikTokAdsAccount?   @relation(fields: [tiktokAdsAccountId], references: [id])
  facebookAdsAccount   FacebookAdsAccount? @relation(fields: [facebookAdsAccountId], references: [id])
  googleAdsAccount     GoogleAdsAccount?   @relation(fields: [googleAdsAccountId], references: [id])
  tenant               Tenant              @relation(fields: [tenantId], references: [id])
  metrics              Metric[]
  alerts               Alert[]

  @@unique([tenantId, externalId])
  @@index([googleAdsAccountId])
  @@index([platform])
  @@index([status])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])  // ⚡ NEW
}
```

**⚠️ Data Migration SQL:**
```sql
-- ก่อน migrate ให้ทำให้ข้อมูลเก่า match กับ Enum values
UPDATE "Campaign" SET platform = 'GOOGLE_ADS' WHERE platform = 'google_ads' OR platform = 'Google Ads';
UPDATE "Campaign" SET platform = 'FACEBOOK' WHERE platform = 'facebook' OR platform = 'Facebook';
UPDATE "Campaign" SET platform = 'TIKTOK' WHERE platform = 'tiktok' OR platform = 'TikTok';
UPDATE "Campaign" SET platform = 'LINE_ADS' WHERE platform = 'line' OR platform = 'LINE';

UPDATE "Campaign" SET status = 'ACTIVE' WHERE status = 'active' OR status = 'ENABLED';
UPDATE "Campaign" SET status = 'PAUSED' WHERE status = 'paused';
UPDATE "Campaign" SET status = 'PENDING' WHERE status = 'pending';
UPDATE "Campaign" SET status = 'DELETED' WHERE status = 'deleted' OR status = 'REMOVED';

UPDATE "Campaign" SET "syncStatus" = 'PENDING' WHERE "syncStatus" = 'pending';
UPDATE "Campaign" SET "syncStatus" = 'SUCCESS' WHERE "syncStatus" = 'success' OR "syncStatus" = 'completed';
UPDATE "Campaign" SET "syncStatus" = 'FAILED' WHERE "syncStatus" = 'failed' OR "syncStatus" = 'error';
```

---

#### 2.2 Alert & AlertRule Models

**AlertRule - ค้นหา:**
```prisma
model AlertRule {
  ...
  type        String   @default("PRESET")
  severity    String   @default("WARNING")
```

**แทนที่:**
```prisma
model AlertRule {
  id          String        @id @default(cuid())
  tenantId    String
  name        String
  type        AlertRuleType @default(PRESET)     // ⚡ String → AlertRuleType
  metric      String
  operator    String
  threshold   Float
  severity    AlertSeverity @default(WARNING)    // ⚡ String → AlertSeverity
  isActive    Boolean       @default(true)
  description String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  alerts      Alert[]

  @@index([tenantId])
  @@index([isActive])
}
```

**Alert - ค้นหา:**
```prisma
model Alert {
  ...
  severity    String
  metadata    String?
  status      String   @default("OPEN")
```

**แทนที่:**
```prisma
model Alert {
  id            String         @id @default(cuid())
  tenantId      String
  ruleId        String?
  campaignId    String?
  type          String
  severity      AlertSeverity  // ⚡ String → AlertSeverity
  title         String
  message       String
  metadata      Json?          // ⚡ String → Json
  status        AlertStatus    @default(OPEN)  // ⚡ String → AlertStatus
  createdAt     DateTime       @default(now())
  resolvedAt    DateTime?

  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  rule          AlertRule?     @relation(fields: [ruleId], references: [id])
  campaign      Campaign?      @relation(fields: [campaignId], references: [id])
  notifications Notification[] // ⚡ NEW relation

  @@index([tenantId])
  @@index([status])
  @@index([severity])
  @@index([createdAt])
  @@index([tenantId, status, createdAt])  // ⚡ NEW
}
```

---

#### 2.3 SyncLog Model

**ค้นหา:**
```prisma
model SyncLog {
  ...
  platform     String
  syncType     String?
  status       String    @default("PENDING")
```

**แทนที่:**
```prisma
model SyncLog {
  id           String      @id @default(cuid())
  tenantId     String
  platform     AdPlatform  // ⚡ String → AdPlatform
  accountId    String?
  syncType     SyncType?   // ⚡ String → SyncType
  status       SyncStatus  @default(PENDING)  // ⚡ String → SyncStatus
  startedAt    DateTime    @default(now())
  completedAt  DateTime?
  errorMessage String?
  recordsCount Int?
  recordsSync  Int         @default(0)
  createdAt    DateTime    @default(now())

  tenant       Tenant      @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([platform])
  @@index([status])
  @@index([createdAt])
  @@index([accountId])
}
```

---

### Step 3: New Feature Implementation 🆕

**เป้าหมาย:** สร้างตาราง Notification และ PlatformToken

#### 3.1 Notification Table (เพิ่มก่อน SyncLog)

```prisma
// ============================================
// Notification System - Sprint 4
// ============================================

model Notification {
  id          String              @id @default(cuid())
  tenantId    String
  userId      String

  // Content
  type        String              // ALERT, REPORT_READY, SYNC_COMPLETE, SYSTEM
  title       String
  message     String              @db.Text

  // Channel & Delivery
  channel     NotificationChannel @default(IN_APP)
  priority    String              @default("NORMAL")  // LOW, NORMAL, HIGH, URGENT

  // 📦 Metadata for Frontend Actions (JSONB)
  metadata    Json?               @db.JsonB
  // Example: { "actionUrl": "/campaigns/123", "actionText": "View", "icon": "alert" }

  // Status
  isRead      Boolean             @default(false)
  readAt      DateTime?
  isDismissed Boolean             @default(false)

  // References
  alertId     String?
  campaignId  String?

  // Timestamps
  scheduledAt DateTime?
  sentAt      DateTime?
  createdAt   DateTime            @default(now())
  expiresAt   DateTime?

  // Relations
  tenant      Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  alert       Alert?              @relation(fields: [alertId], references: [id], onDelete: SetNull)

  @@index([userId, isRead])
  @@index([tenantId])
  @@index([createdAt])
  @@index([type])
  @@index([userId, createdAt])
}
```

#### 3.2 PlatformToken Table (Optional - สำหรับ Unified Token)

```prisma
// ============================================
// Unified Token Management - Sprint 4
// ============================================

model PlatformToken {
  id              String      @id @default(cuid())
  tenantId        String
  platform        AdPlatform
  accountId       String

  // Token Storage
  accessToken     String      @db.Text
  refreshToken    String?     @db.Text
  tokenType       String?     @default("Bearer")
  tokenScope      String?

  // Lifecycle
  expiresAt       DateTime?
  refreshedAt     DateTime?
  lastUsedAt      DateTime?

  // Health
  isValid         Boolean     @default(true)
  errorMessage    String?
  refreshAttempts Int         @default(0)

  // Audit
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  createdBy       String?

  tenant          Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, platform, accountId])
  @@index([platform])
  @@index([isValid])
}
```

---

### Step 4: Relation Wiring 🔗

**เป้าหมาย:** เพิ่ม Relations ใน Tenant Model

**ค้นหา Tenant Model แล้วเพิ่ม Relations:**

```prisma
model Tenant {
  id                      String                   @id @default(cuid())
  name                    String
  settings                Json?                    // ⚡ String → Json
  createdAt               DateTime                 @default(now())
  updatedAt               DateTime                 @updatedAt

  // Existing Relations
  apiConnections          APIConnection[]
  campaigns               Campaign[]
  facebookAdsAccounts     FacebookAdsAccount[]     @relation("FacebookAdsAccounts")
  googleAdsAccounts       GoogleAdsAccount[]       @relation("GoogleAdsAccounts")
  googleAnalyticsAccounts GoogleAnalyticsAccount[] @relation("GoogleAnalyticsAccounts")
  lineAdsAccounts         LineAdsAccount[]         @relation("LineAdsAccounts")
  tiktokAdsAccounts       TikTokAdsAccount[]       @relation("TikTokAdsAccounts")
  users                   User[]
  alertRules              AlertRule[]
  alerts                  Alert[]
  syncLogs                SyncLog[]

  // ⚡ NEW Relations for Sprint 4
  notifications           Notification[]
  platformTokens          PlatformToken[]
}
```

---

## 3. Verification Plan ✅

### 3.1 Pre-Migration Verification

```bash
# 1. Validate schema syntax
npx prisma format

# 2. Check for errors without migrating
npx prisma validate

# 3. Generate migration preview (dry-run)
npx prisma migrate dev --create-only --name sprint4_upgrade
```

### 3.2 Migration Execution

```bash
# Option A: Development (ถ้า data ไม่สำคัญ)
npx prisma migrate reset  # ⚠️ DELETES ALL DATA
npx prisma migrate dev --name sprint4_upgrade

# Option B: Production-safe (รักษา data)
npx prisma migrate dev --name sprint4_upgrade
# ถ้ามี error ให้ run SQL migration scripts ก่อน แล้ว re-run
```

### 3.3 Post-Migration Verification

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Open Prisma Studio to verify
npx prisma studio

# 3. Check all tables exist
# In Prisma Studio, verify:
# - [ ] Notification table exists
# - [ ] PlatformToken table exists (if created)
# - [ ] User has new security fields
# - [ ] Campaign.platform is now Enum
```

### 3.4 Application Verification

```bash
# 1. Build backend to check for TS errors
cd backend
npm run build

# 2. Run tests
npm run test

# 3. Start dev server
npm run start:dev
```

---

## 4. Rollback Plan 🔙

> [!WARNING]
> **ใช้เฉพาะเมื่อจำเป็นเท่านั้น!**

```bash
# 1. Restore from backup
psql -h <host> -U <user> -d <database> < backup_YYYYMMDD_HHMMSS.sql

# 2. หรือ rollback migration
npx prisma migrate resolve --rolled-back sprint4_upgrade

# 3. Reset Prisma client
npx prisma generate
```

---

## 5. Final Checklist ✔️

```markdown
## Pre-Migration
- [ ] Database backup created
- [ ] Team notified
- [ ] Schema changes reviewed by peer

## Migration Execution
- [ ] Step 1: Enums added to schema
- [ ] Step 2: User security fields added
- [ ] Step 3: Campaign/Alert/SyncLog enum conversion
- [ ] Step 4: Notification table created
- [ ] Step 5: PlatformToken table created (optional)
- [ ] Step 6: Tenant relations updated
- [ ] Step 7: `npx prisma migrate dev` successful

## Post-Migration
- [ ] `npx prisma generate` successful
- [ ] `npx prisma studio` shows all tables correctly
- [ ] Backend compiles without errors
- [ ] All tests pass
- [ ] Dev server starts successfully

## Documentation
- [ ] CHANGELOG updated
- [ ] database-wiki.md marked as implemented
- [ ] db-audit.md issues marked as resolved
```

---

## Appendix: Quick Reference

### Enum Value Mapping (Legacy → New)

| Model | Field | Legacy Values | New Enum Values |
|-------|-------|---------------|-----------------|
| User | role | "CLIENT", "ADMIN" | CLIENT, ADMIN, MANAGER, VIEWER |
| Campaign | platform | "google_ads", "facebook" | GOOGLE_ADS, FACEBOOK, TIKTOK, LINE_ADS |
| Campaign | status | "active", "paused" | ACTIVE, PAUSED, DELETED, PENDING, COMPLETED |
| SyncLog | status | "pending", "success" | PENDING, STARTED, IN_PROGRESS, SUCCESS, COMPLETED, FAILED |
| Alert | severity | "WARNING", "CRITICAL" | INFO, WARNING, CRITICAL |

---

> **Plan Created by:** Technical Lead & DevOps Specialist  
> **Execution Window:** Sprint 4 Week 1  
> **Estimated Time:** 2-4 hours (depending on data volume)
