# Auth Logic & Data Consistency Audit

**Date:** 2026-01-13  
**Subject:** Login/Register Failure - Root Cause Analysis  
**Status:** 🔴 **CRITICAL ISSUES FOUND**

---

## Executive Summary

การตรวจสอบพบ **Root Cause หลัก**: `ResponseTransformInterceptor` ถูกสร้างไว้แต่ **ไม่ได้ลงทะเบียนใน `app.module.ts`**

ผลลัพธ์คือ:
- **Backend ส่ง:** `{ user, accessToken, refreshToken }`  
- **Frontend คาดหวัง:** `{ success: true, data: { user, accessToken, refreshToken } }`  
- **ผลลัพธ์:** Frontend เข้าถึง `response.data.data` ได้ `undefined`

---

## 1. 📦 Response Structure Analysis

### 1.1 Backend Return Value

**File:** [auth.service.ts:125-134](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/auth/auth.service.ts#L125-134)

```typescript
// Login returns:
return {
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenant: { id: user.tenant.id, name: user.tenant.name },
  },
  ...tokens,  // { accessToken, refreshToken }
};

// Register returns (line 47):
return { user, ...tokens };
```

**Actual Response (without interceptor):**
```json
{
  "user": { "id": "...", "email": "...", "name": "..." },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

### 1.2 ResponseTransformInterceptor Exists But NOT Registered

**File:** [response-transform.interceptor.ts](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/common/interceptors/response-transform.interceptor.ts)

```typescript
// ✅ Interceptor exists and would wrap response like this:
return {
  success: true,
  data,  // <- Original response goes here
  message: 'Success',
};
```

**File:** [app.module.ts](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/app.module.ts)

```typescript
// ❌ PROBLEM: Only ThrottlerGuard is registered, NOT the interceptor!
providers: [
  AppService,
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,  // Only this
  },
  // ❌ MISSING: { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor }
],
```

### 1.3 Frontend Data Access

**File:** [auth-store.ts:72-73](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/stores/auth-store.ts#L72-73)

```typescript
// Frontend expects nested structure:
const { accessToken, refreshToken, user } = response.data.data;
//                                                  ^^^^
//                                          ❌ This is UNDEFINED!
```

---

## 🔴 ROOT CAUSE #1: Response Structure Mismatch

| Layer | Returns | Expected by Frontend |
|-------|---------|---------------------|
| `auth.service.ts` | `{ user, accessToken, refreshToken }` | - |
| Axios wraps as | `response.data` = `{ user, accessToken, refreshToken }` | - |
| Frontend accesses | `response.data.data` | `{ user, accessToken, refreshToken }` |
| **Result** | ❌ `undefined` | - |

### Corrective Plan

**Option A: Register Interceptor (Recommended)**

Edit `backend/src/app.module.ts`:

```typescript
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

@Module({
  // ...
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,  // ✅ ADD THIS
    },
  ],
})
```

**Option B: Fix Frontend (Not Recommended)**

Change frontend to access `response.data` directly instead of `response.data.data`.  
⚠️ ไม่แนะนำเพราะจะทำให้ไม่ตรงตาม API Standard ที่วางไว้

---

## 2. 🔐 Password Hashing & Seeding Check

### 2.1 Seed Data

**File:** [seed.ts:36](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/prisma/seed.ts#L36)

```typescript
const hashedPassword = await bcrypt.hash('password123', 10);  // ✅ CORRECT
```

**Seed Credentials:**
- Email: `admin@rga.com`
- Password: `password123` (hashed in DB)

### 2.2 Login Verification

**File:** [auth.service.ts:71](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/auth/auth.service.ts#L71)

```typescript
const valid = await bcrypt.compare(dto.password, user.password);  // ✅ CORRECT
```

### Verdict: ✅ PASS

รหัสผ่านถูก Hash อย่างถูกต้อง และ bcrypt.compare() ถูกใช้ในการตรวจสอบ

---

## 3. 🧩 Frontend Logic Integrity

### 3.1 Token Storage

**File:** [token-manager.ts](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/lib/token-manager.ts)

```typescript
// ✅ CORRECT - Standalone module
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}
```

**File:** [auth-store.ts:76](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/stores/auth-store.ts#L76)

```typescript
// ✅ CORRECT - Uses token-manager
setTokens(accessToken, refreshToken);
```

### Verdict: ✅ PASS

### 3.2 Register Flow Field Matching

| Frontend (Register.tsx:55-60) | Backend (RegisterDto) | Match |
|-------------------------------|----------------------|-------|
| `email` | `email: string` | ✅ |
| `password` | `password: string` | ✅ |
| `name` | `name: string` | ✅ |
| `companyName` | `companyName: string` | ✅ |

### Verdict: ✅ PASS

---

## 4. 📋 Summary of Root Causes

| # | Severity | Issue | Impact | Fix Location |
|---|----------|-------|--------|--------------|
| **1** | 🔴 **CRITICAL** | `ResponseTransformInterceptor` NOT registered | Frontend gets `undefined` when accessing `response.data.data` | `backend/src/app.module.ts` |
| 2 | ✅ OK | Password hashing | Correct | - |
| 3 | ✅ OK | Token storage | Correct | - |
| 4 | ✅ OK | Register DTO fields | Correct | - |

---

## 5. 🔧 Corrective Plan

### Step 1: Register ResponseTransformInterceptor

**File:** `backend/src/app.module.ts`

**Change:**
```diff
- import { APP_GUARD } from '@nestjs/core';
+ import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
+ import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
+   {
+     provide: APP_INTERCEPTOR,
+     useClass: ResponseTransformInterceptor,
+   },
  ],
```

### Step 2: Restart Backend

```bash
cd backend
npm run start:dev
```

### Step 3: Test Login

```bash
# Expected Response after fix:
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  },
  "message": "Success"
}
```

---

## 6. Verification Steps

### Manual Test

1. Start Backend: `cd backend && npm run start:dev`
2. Start Frontend: `cd frontend && npm run dev`
3. Open: http://localhost:5173/login
4. Enter: `admin@rga.com` / `password123`
5. Check Network Tab:
   - Request: `POST /api/v1/auth/login`
   - Response should have `{ success: true, data: { ... } }`
6. Should redirect to `/dashboard`

### Debug Commands (Browser Console)

```javascript
// After login attempt, check localStorage
console.log('Access Token:', localStorage.getItem('accessToken'));
console.log('Refresh Token:', localStorage.getItem('refreshToken'));
```

---

> **Estimated Fix Time:** 5 minutes  
> **Confidence Level:** 95%
