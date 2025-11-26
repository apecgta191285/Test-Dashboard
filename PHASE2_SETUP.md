# Sprint 2 Phase 2: Google Ads Campaign Sync

## ✅ สิ่งที่เสร็จแล้ว

### Backend
- ✅ Google Ads Campaign Service (fetch campaigns from API)
- ✅ Google Ads Campaign Controller (3 endpoints)
- ✅ Database schema พร้อม (externalId, googleAdsAccountId, lastSyncedAt)
- ✅ OAuth flow ทำงานสมบูรณ์

### Frontend
- ✅ หน้า `/integrations` - แสดง connected accounts
- ✅ ปุ่ม "เชื่อมต่อ Google Ads Account ใหม่"
- ✅ ปุ่ม "Fetch Campaigns" - ดึงข้อมูลจาก Google Ads
- ✅ ปุ่ม "Sync to DB" - บันทึกลง database
- ✅ แสดงตาราง campaigns พร้อม metrics

## 🚀 วิธีรัน

### 1. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
DATABASE_URL="file:./prisma/dev.db" npx prisma db push

# Seed database
DATABASE_URL="file:./prisma/dev.db" npx ts-node prisma/seed.ts

# Build
NODE_OPTIONS="--max-old-space-size=6144" DATABASE_URL="file:./prisma/dev.db" npm run build

# Run
DATABASE_URL="file:./prisma/dev.db" node dist/src/main.js
```

Backend จะรันที่ `http://localhost:3000`

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Run dev server
npm run dev
```

Frontend จะรันที่ `http://localhost:3001` (หรือ port ถัดไปถ้า 3001 ถูกใช้)

## 📋 API Endpoints

### Google Ads OAuth
- `GET /api/v1/integrations/google-ads/auth-url` - สร้าง OAuth URL
- `GET /api/v1/integrations/google-ads/callback` - รับ callback จาก Google
- `GET /api/v1/integrations/google-ads/accounts` - ดูรายการ accounts

### Google Ads Campaigns
- `GET /api/v1/integrations/google-ads/campaigns/accounts` - ดูรายการ accounts
- `GET /api/v1/integrations/google-ads/campaigns/:accountId/fetch` - ดึง campaigns (ไม่บันทึก)
- `POST /api/v1/integrations/google-ads/campaigns/:accountId/sync` - ดึงและบันทึกลง DB

## 🧪 ทดสอบ

### 1. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

### 2. Get OAuth URL
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/integrations/google-ads/auth-url
```

### 3. เปิด authUrl ใน browser
- คลิก "ดำเนินการต่อ"
- จะ redirect กลับมาที่ `http://localhost:3001/integrations?success=true&account_id=xxx`

### 4. Fetch Campaigns
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/integrations/google-ads/campaigns/ACCOUNT_ID/fetch
```

### 5. Sync to Database
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/integrations/google-ads/campaigns/ACCOUNT_ID/sync
```

## 📊 Database Schema

### GoogleAdsAccount
- id, tenantId, customerId, customerName
- accessToken, refreshToken, tokenExpiresAt
- status, lastSyncAt

### Campaign (updated)
- เพิ่ม `externalId` - Google Ads Campaign ID
- เพิ่ม `googleAdsAccountId` - Foreign key to GoogleAdsAccount
- เพิ่ม `lastSyncedAt` - เวลา sync ล่าสุด
- เพิ่ม `syncStatus` - SUCCESS/PENDING/FAILED

## 🎯 ขั้นตอนถัดไป (Phase 3)

1. แสดง synced campaigns ในหน้า Dashboard
2. Auto-sync schedule (ทุก 1 ชั่วโมง)
3. Sync metrics (impressions, clicks, cost) จาก Google Ads
4. Error handling และ retry mechanism

## ⚠️ หมายเหตุ

- Backend ใช้ production build เพราะ dev mode ใช้ memory มาก
- Frontend port อาจเปลี่ยนเป็น 3002 หรือ 3003 ถ้า 3001 ถูกใช้
- ต้องมี Google Ads account ที่เชื่อมต่อจริงเพื่อทดสอบ fetch campaigns
- OAuth callback redirect ไปที่ localhost:3001 (ตั้งค่าใน .env)
