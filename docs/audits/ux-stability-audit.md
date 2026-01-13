# 🔍 UX Stability Audit Report

**Project:** RGA Marketing Dashboard  
**Date:** 2025-01-13  
**Auditor:** Principal Frontend Engineer & Performance Specialist  
**Focus Areas:** Login Flickering, Global Instability, Architecture Transition

---

## Executive Summary

การวิเคราะห์เชิงลึกพบ **5 Critical Defects** และ **3 Warning Issues** ที่เป็นสาเหตุหลักของปัญหา UX:

| Severity | Issue | Impact |
|----------|-------|--------|
| 🔴 Critical | Data Extraction Mismatch ใน AuthContext | Login ล้มเหลวแม้ข้อมูลถูกต้อง |
| 🔴 Critical | Force Page Reload ใน Token Refresh | หน้าจอกระตุกเมื่อ Token หมดอายุ |
| 🔴 Critical | Dual Auth Systems | State Conflict ระหว่าง Context และ Zustand |
| 🟡 Warning | Missing Refresh Token ใน AuthContext | Token Management ไม่สมบูรณ์ |
| 🟡 Warning | Inconsistent LocalStorage Keys | Data Persistence ผิดพลาด |

---

## 1. 🕵️‍♂️ Root Cause Analysis: Login Page

### 1.1 Event Handling Analysis

**Status:** ✅ CORRECT

```typescript
// Login.tsx (Line 19-20)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();  // ✅ Implemented correctly
```

> [!TIP]
> Form submission ถูกป้องกันการ reload อย่างถูกต้องแล้ว `e.preventDefault()` ทำงานตามที่คาดหวัง

**สรุป:** การ Reload ไม่ได้เกิดจาก Form Submission แต่เกิดจากสาเหตุอื่น (ดูข้อ 1.2 และ 3.2)

---

### 1.2 Error State Analysis

> [!CAUTION]
> **🔴 CRITICAL DEFECT #1: Data Extraction Mismatch**

**ปัญหา:** `AuthContext` ดึงข้อมูลจาก API Response ผิด structure

**AuthContext.tsx (Lines 62-67):**
```typescript
const response = await authService.login({ email, password });
const { accessToken, user: userData } = response.data;  // ❌ WRONG!
```

**Backend Response (Actual):**
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... }
  }
}
```

**วิเคราะห์:**
- `response.data` = `{ success, data: { accessToken, user } }`
- `response.data.data` = `{ accessToken, user }` ← **ควรใช้อันนี้**
- ผลลัพธ์: `accessToken` และ `userData` เป็น `undefined`

**ผลกระทบ:**
1. Token ถูกเก็บเป็น `"undefined"` ใน localStorage
2. User state เป็น `null`
3. `isAuthenticated` เป็น `false` ตลอด
4. เมื่อพยายาม redirect ไป `/dashboard` → `ProtectedRoute` ตรวจพบว่าไม่ authenticate → Redirect กลับ `/login`

---

### 1.3 Race Condition Analysis

**Status:** ⚠️ POTENTIAL ISSUE

```typescript
// Login.tsx (Lines 24-31)
try {
  await login(email, password);
  setLocation('/dashboard');      // ← อาจทำงานก่อน state update เสร็จ
} catch (err: any) {
  setError(err.response?.data?.message || 'Login failed. Please try again.');
} finally {
  setIsLoading(false);
}
```

**ปัญหาที่เป็นไปได้:**
1. `login()` resolve สำเร็จ (แม้ data extraction จะผิด)
2. `setLocation('/dashboard')` ทำงานทันที
3. Component unmount ก่อน `setIsLoading(false)` ทำงาน (ไม่มี memory leak warning เพราะ Strict Mode)

> [!NOTE]
> นี่ไม่ใช่ root cause หลัก แต่ควรพิจารณา fix ในขั้นตอน refactor

---

## 2. 🏗️ Architecture Conflict Analysis

### 2.1 Current State: Context vs Zustand

**Files using `useAuth` (Context):**

| File | Usage |
|------|-------|
| [Login.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/pages/Login.tsx) | `login()` function |
| [Register.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/pages/Register.tsx) | `register()` function |
| [ProtectedRoute.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/components/ProtectedRoute.tsx) | `isAuthenticated`, `user`, `isLoading` |
| [DashboardShell.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/components/layout/DashboardShell.tsx) | `user`, `isLoading` |
| [Sidebar.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/components/layout/Sidebar.tsx) | `logout()`, `user` |
| [NotFound.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/pages/NotFound.tsx) | `isAuthenticated`, `isLoading` |

**Files using `useAuthStore` (Zustand):**
- ❌ **ไม่มีใช้งานจริง** (มีแค่ export ไว้)

> [!IMPORTANT]
> **🔴 CRITICAL DEFECT #2: Dual Auth Systems**  
> มี 2 ระบบ auth ที่มี logic คล้ายๆ กันแต่ **incompatible**:
> - `AuthContext` ใช้ `response.data.accessToken` (WRONG)
> - `auth-store.ts` ใช้ `response.data.data.accessToken` (CORRECT)

### 2.2 Key Differences

| Feature | AuthContext (Legacy) | auth-store (Zustand) |
|---------|---------------------|----------------------|
| Data Extraction | `response.data` ❌ | `response.data.data` ✅ |
| Refresh Token | ❌ Not handled | ✅ Saved to localStorage |
| Persistence | Manual localStorage | Zustand persist middleware |
| Account Lock Handling | ❌ None | ✅ Implemented |
| Error State | Context-level | Store-level |

---

### 2.3 Refactor Strategy: ทำไม Zustand ช่วยแก้ปัญหาได้

**ปัญหาของ React Context:**

```
┌─────────────────────────────────────────────────────────────┐
│ AuthProvider                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ เมื่อ state เปลี่ยน → Re-render ALL children           ││
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐             ││
│  │  │ Dashboard │ │ Campaigns │ │ Settings  │ ... 10+ Pages││
│  │  └───────────┘ └───────────┘ └───────────┘             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**สาเหตุ Flickering:**
1. `setIsLoading(true)` → Re-render ทุก component ที่ใช้ `useAuth()`
2. `setUser(userData)` → Re-render อีกรอบ
3. `setIsLoading(false)` → Re-render อีก 1 รอบ
4. **รวม 3 re-renders ต่อ 1 login attempt**

**Solution ด้วย Zustand:**

```typescript
// Selective subscription - ไม่ re-render ถ้า state นั้นไม่เปลี่ยน
const user = useAuthStore((state) => state.user);
const isLoading = useAuthStore((state) => state.isLoading);
```

> [!TIP]
> Zustand ใช้ **selector pattern** ทำให้ component re-render เฉพาะเมื่อ state ที่ select ไว้เปลี่ยนเท่านั้น

---

## 3. ⚡ Global Stability Check

### 3.1 App Structure Analysis

**Current Structure (App.tsx):**

```
QueryClientProvider
  └── ErrorBoundary
        └── ThemeProvider
              └── AuthProvider        ← ⚠️ Provider ที่ทำให้เกิด Re-render
                    └── TooltipProvider
                          └── Toaster
                          └── Router (Switch)
                                └── All Pages...
```

**ปัญหา:**
1. `AuthProvider` ครอบทุก page รวมถึง `/login` และ `/register`
2. เมื่อ auth state เปลี่ยน → ทุก page ถูก re-render
3. ไม่มี `Suspense` boundary สำหรับ loading states

---

### 3.2 Axios Interceptor Analysis

> [!CAUTION]
> **🔴 CRITICAL DEFECT #3: Force Page Reload**

**api-client.ts (Lines 131-134):**
```typescript
// Redirect to login
if (typeof window !== 'undefined') {
  window.location.href = '/login?expired=true';  // ❌ HARD RELOAD!
}
```

**ปัญหา:**
- `window.location.href` ทำให้ **full page reload**
- ทุก state หายหมด
- User experience แย่มาก

**สถานการณ์ที่ trigger:**
1. Access Token หมดอายุ
2. Refresh Token หมดอายุหรือไม่ถูกต้อง
3. Backend return 401 สำหรับทุก request

---

### 3.3 Race Condition ใน Token Refresh

**api-client.ts (Lines 86-95):**
```typescript
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then((token) => {
    // Retry with new token
  });
}
```

**วิเคราะห์:** 
✅ Queue mechanism ถูกต้อง - ป้องกัน multiple refresh requests พร้อมกัน

---

## 4. 📋 Summary of Defects

### 🔴 Critical Defects (ต้องแก้ทันที)

| ID | Location | Defect | Root Cause | Impact |
|----|----------|--------|------------|--------|
| DEF-001 | [AuthContext.tsx:62-67](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/contexts/AuthContext.tsx#L62-L67) | Data Extraction Mismatch | `response.data` แทนที่จะเป็น `response.data.data` | Login ล้มเหลวตลอด |
| DEF-002 | [api-client.ts:133](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/services/api-client.ts#L133) | Force Page Reload | `window.location.href` แทน Router navigation | หน้าจอกระตุก, state หาย |
| DEF-003 | Multiple files | Dual Auth Systems | Context + Zustand ใช้งานปนกัน | State inconsistency |

### 🟡 Warning Issues (ควรแก้ไข)

| ID | Location | Issue | Solution Direction |
|----|----------|-------|-------------------|
| WARN-001 | [AuthContext.tsx:44-47](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/contexts/AuthContext.tsx#L44-L47) | ไม่เก็บ Refresh Token | เพิ่ม `localStorage.setItem('refreshToken', refreshToken)` |
| WARN-002 | [auth-store.ts:93-105](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/stores/auth-store.ts#L93-L105) | `checkAuth` อ่าน `localStorage.user` แต่ไม่เคยเขียน | ใช้ Zustand persist middleware แทน |
| WARN-003 | App.tsx | ไม่มี Suspense boundary | เพิ่ม `<Suspense>` สำหรับ lazy loading |

---

## 5. 🎯 Solution Directions (ยังไม่ต้องเขียนโค้ด)

### Phase 1: Quick Fix (แก้ปัญหาเร่งด่วน)

1. **DEF-001: Fix Data Extraction**
   ```
   เปลี่ยน response.data → response.data.data ใน AuthContext
   หรือ migrate ไปใช้ auth-store โดยตรง
   ```

2. **DEF-002: Replace Hard Reload**
   ```
   สร้าง event emitter หรือใช้ global state เพื่อ trigger navigation
   ใช้ Router programmatic navigation แทน window.location.href
   ```

### Phase 2: Architecture Migration

1. **DEF-003: Unify Auth System**
   ```
   ลบ AuthContext.tsx
   Migrate ทุก component ไปใช้ useAuthStore
   Update api-client.ts ให้ sync กับ Zustand store
   ```

2. **Optimize Re-renders**
   ```
   ใช้ Zustand selectors อย่างถูกต้อง
   แยก loading state ออกจาก user state
   ```

### Phase 3: Enhancement

1. **Add Suspense Boundaries**
   ```
   Lazy load pages ที่ไม่ได้ใช้บ่อย
   แสดง skeleton loader ระหว่าง load
   ```

2. **Improve Error Handling**
   ```
   เพิ่ม Toast notifications สำหรับ auth errors
   Handle account locked scenario อย่างชัดเจน
   ```

---

## 6. 🧪 Recommended Testing After Fix

1. **Unit Tests**
   - Test login with correct credentials
   - Test login with wrong password (5 times for lock)
   - Test token refresh flow

2. **Integration Tests**
   - Test protected route redirect
   - Test session persistence after page reload

3. **E2E Tests**
   - Full login → dashboard → logout flow
   - Token expiration handling

---

## Appendix: File Cross-Reference

| File | Line | Category | Status |
|------|------|----------|--------|
| Login.tsx | 20 | Event Handling | ✅ OK |
| AuthContext.tsx | 62-67 | Data Extraction | 🔴 Critical |
| auth-store.ts | 44 | Data Extraction | ✅ OK |
| api-client.ts | 133 | Navigation | 🔴 Critical |
| ProtectedRoute.tsx | 24-26 | Auth Check | ⚠️ Depends on DEF-001 |
