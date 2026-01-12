# Frontend Code Audit Report V2
> **Auditor:** Lead Frontend Auditor & React Specialist  
> **Date:** 2026-01-12  
> **Scope:** Audit against Vite + Zustand stack per updated `frontend-wiki.md`

---

## Executive Summary

| Category | Status | Issues Found |
|----------|--------|--------------|
| Type Safety | 🟡 Medium | 8 files with hardcoded strings |
| Schema Alignment | 🔴 Critical | User missing 5 Sprint 4 fields |
| Routing | ✅ Good | Wouter used correctly, no react-router |
| State Management | 🔴 Critical | Zustand not installed, 3 Contexts to migrate |
| Axios Interceptor | 🟡 Medium | Works but needs race condition fix |
| Notification UI | 🔴 Critical | Does not exist |
| Styling | ✅ Good | No inline styles, Tailwind used |

---

## 1. 🛑 Type Safety & Enum Check

### 1.1 Hardcoded String Violations

| File | Line | Violation | Severity |
|------|------|-----------|----------|
| [Campaigns.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/pages/Campaigns.tsx) | 23, 25 | `platform: 'GOOGLE_ADS'`, `status: 'ACTIVE'` | 🔴 High |
| [Users.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/pages/Users.tsx) | 24, 74 | `role: 'CLIENT'`, hardcoded role validation | 🔴 High |
| [Sidebar.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/components/layout/Sidebar.tsx) | 48 | `user?.role === 'ADMIN'` | 🔴 High |
| [StatusBadge.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/components/ui/StatusBadge.tsx) | 36-44 | Multiple hardcoded status/role strings | 🔴 High |
| [alert-service.ts](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/services/alert-service.ts) | 12, 25 | `severity: 'INFO' \| 'WARNING' \| 'CRITICAL'` | 🟡 Medium |
| [TopCampaignsTable.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/features/dashboard/components/TopCampaignsTable.tsx) | 49 | `status.toUpperCase() === 'ACTIVE'` | 🟡 Medium |
| [PlatformTabs.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/components/dashboard/PlatformTabs.tsx) | 4, 14-15 | Custom Platform type literals | 🟡 Medium |
| Integration Cards | Multiple | `account.status === 'ACTIVE'` | 🟡 Medium |

**Missing File:** `types/enums.ts` does not exist — must create!

---

### 1.2 Schema Alignment (Frontend vs Prisma)

**User Interface — Missing Sprint 4 Fields:**

```diff
  export interface User {
    // ... existing fields ...
    lastLogin?: string | null;  // ⚠️ Exists but wrong name
+   lastLoginAt?: string;       // 🆕 Sprint 4 (correct Prisma name)
+   lastLoginIp?: string;       // 🆕 Sprint 4
+   failedLoginCount?: number;  // 🆕 Sprint 4
+   lockedUntil?: string;       // 🆕 Sprint 4
+   twoFactorEnabled?: boolean; // 🆕 Sprint 4
  }
```

**Campaign Interface — Type Mismatches:**

| Field | Current | Should Be |
|-------|---------|-----------|
| `platform` | `string` | `AdPlatform` |
| `status` | `string` | `CampaignStatus` |

**Missing Notification Interface:**
```typescript
// 🚨 DOES NOT EXIST — Required for Sprint 4
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
```

---

## 2. 🏗️ Architecture & Stack Check

### 2.1 Routing — ✅ PASS

| Check | Result |
|-------|--------|
| Uses Wouter? | ✅ Yes (11 files) |
| react-router found? | ✅ No (clean) |

**Files using Wouter:**
- `pages/Login.tsx`, `pages/Register.tsx`, `pages/ForgotPassword.tsx`
- `components/ProtectedRoute.tsx`, `components/layout/Sidebar.tsx`
- `components/dashboard/GettingStartedWidget.tsx`
- `components/IntegrationChecklist.tsx`
- `components/integrations/*/` (Google Ads, Line, GA cards)
- `hooks/useIntegrationCallback.ts`

---

### 2.2 State Management — 🔴 CRITICAL

| Check | Result |
|-------|--------|
| Zustand installed? | ❌ **NO** |
| `stores/` directory? | ❌ Does not exist |
| Context API usage? | ⚠️ 3 custom contexts |

**Context APIs to Migrate to Zustand:**

| Context | Location | Priority |
|---------|----------|----------|
| `AuthContext` | `contexts/AuthContext.tsx` | 🔴 High |
| `DateRangeContext` | `contexts/DateRangeContext.tsx` | 🟡 Medium |
| `ThemeContext` | `contexts/ThemeContext.tsx` | 🟢 Low (keep - next-themes) |

**Shadcn Component Contexts (Keep - internal use):**
- `CarouselContext`, `FormFieldContext`, `SidebarContext`, etc.

---

### 2.3 Directory Structure

**Current Structure Issues:**

| Check | Status | Notes |
|-------|--------|-------|
| `stores/` directory | ❌ Missing | Must create for Zustand |
| `types/enums.ts` | ❌ Missing | Must create |
| `lib/enum-mappers.ts` | ❌ Missing | Must create |
| `lib/error-handler.ts` | ❌ Missing | Must create |
| Feature-based structure | ⚠️ Partial | Only `features/dashboard/` exists |

---

## 3. 🧩 Feature & Logic Gaps

### 3.1 Axios Interceptor — 🟡 NEEDS IMPROVEMENT

**Current Implementation:** [api-client.ts](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/services/api-client.ts)

| Feature | Status | 
|---------|--------|
| Request interceptor (add token) | ✅ Exists |
| Response interceptor (401 handling) | ✅ Exists |
| Refresh token flow | ✅ Works |
| `isRefreshing` flag | ❌ Missing (race condition risk) |
| Request queue | ❌ Missing (concurrent request issue) |
| Extract from `response.data.data` | ❌ Expects `response.data` (wrong nesting) |

**Bug Found (Line 46):**
```typescript
// Current - expects wrong structure
const { accessToken, refreshToken: newRefreshToken } = response.data;

// Should be (per backend API format)
const { accessToken, refreshToken: newRefreshToken } = response.data.data;
```

---

### 3.2 Notification UI — 🔴 DOES NOT EXIST

| Component | Status |
|-----------|--------|
| `NotificationBell` | ❌ Must create |
| `stores/notification-store.ts` | ❌ Must create |
| `features/notifications/` | ❌ Must create |
| API integration | ❌ Must create |

---

### 3.3 Auth Security Handling

**Login Page ([Login.tsx](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/frontend/src/pages/Login.tsx)):**

| Feature | Status |
|---------|--------|
| Basic error display | ✅ |
| Account Locked message | ❌ Generic error only |
| Too many attempts warning | ❌ Not handled |
| 2FA support | ❌ Not implemented |

---

### 3.4 Shadcn UI Usage — ✅ GOOD

| Check | Result |
|-------|--------|
| Inline styles found? | ✅ None |
| Tailwind classes used? | ✅ Yes |
| Shadcn components? | ✅ 59 components in `ui/` |

---

## 4. 📦 Dependency Check

### 4.1 Required Packages

| Package | Required | Installed | Status |
|---------|----------|-----------|--------|
| `vite` | ✅ | ✅ 7.1.7 | ✅ OK |
| `react` | ✅ | ✅ 18.3.1 | ✅ OK |
| `wouter` | ✅ | ✅ 3.3.5 | ✅ OK |
| `axios` | ✅ | ✅ 1.12.0 | ✅ OK |
| `@tanstack/react-query` | ✅ | ✅ 4.41.0 | ✅ OK |
| `tailwindcss` | ✅ | ✅ 4.1.14 | ✅ OK |
| `sonner` | ✅ | ✅ 2.0.7 | ✅ OK |
| `zod` | ✅ | ✅ 4.1.12 | ✅ OK |
| `react-hook-form` | ✅ | ✅ 7.64.0 | ✅ OK |
| `recharts` | ✅ | ✅ 2.15.2 | ✅ OK |
| **zustand** | ✅ | ❌ **MISSING** | 🔴 Install |

### 4.2 Legacy Packages to Check

| Package | Status | Notes |
|---------|--------|-------|
| `react-scripts` | ✅ Not found | Clean (was never CRA) |
| `react-router` | ✅ Not found | Clean |
| `redux` | ✅ Not found | Clean |

---

## 5. 🛠️ Actionable Refactor Checklist

### 🔴 High Priority (Week 1)

- [ ] **Install Zustand:** `pnpm add zustand`
- [ ] **Create `types/enums.ts`** with all Prisma-matching enums
- [ ] **Create `stores/` directory** with:
  - [ ] `auth-store.ts`
  - [ ] `notification-store.ts`
  - [ ] `ui-store.ts`
- [ ] **Create Notification System:**
  - [ ] `components/common/NotificationBell.tsx`
  - [ ] `features/notifications/` directory
- [ ] **Fix `types/api.ts`:**
  - [ ] Add missing User Sprint 4 fields
  - [ ] Add Notification interface
  - [ ] Change `string` → enum types
- [ ] **Fix `api-client.ts`:**
  - [ ] Add `isRefreshing` flag
  - [ ] Add request queue for concurrent 401s
  - [ ] Fix `response.data` → `response.data.data`

### 🟡 Medium Priority (Week 2)

- [ ] **Create `lib/enum-mappers.ts`** — Enum to Badge utilities
- [ ] **Create `lib/error-handler.ts`** — Global error handling
- [ ] **Refactor hardcoded strings:**
  - [ ] `pages/Campaigns.tsx`
  - [ ] `pages/Users.tsx`
  - [ ] `components/layout/Sidebar.tsx`
  - [ ] `components/ui/StatusBadge.tsx`
  - [ ] `services/alert-service.ts`
- [ ] **Migrate `AuthContext` → `auth-store.ts`**
- [ ] **Enhance Login error handling** — Account Locked, 2FA

### 🟢 Low Priority (Week 3+)

- [ ] **Migrate `DateRangeContext` → `ui-store.ts`**
- [ ] **Create feature directories:**
  - [ ] `features/auth/`
  - [ ] `features/campaigns/`
  - [ ] `features/alerts/`
  - [ ] `features/users/`
- [ ] **Move services to features** (gradual migration)

---

## 6. Files to Create

| Path | Purpose |
|------|---------|
| `src/types/enums.ts` | Prisma-matching enum constants |
| `src/stores/auth-store.ts` | Zustand auth state |
| `src/stores/notification-store.ts` | Zustand notification state |
| `src/stores/ui-store.ts` | Zustand UI state |
| `src/lib/enum-mappers.ts` | Enum to UI utilities |
| `src/lib/error-handler.ts` | Global error handling |
| `src/components/common/NotificationBell.tsx` | Notification UI |

---

## 7. Files to Modify

| Path | Changes |
|------|---------|
| `types/api.ts` | Add Sprint 4 fields, use enum types |
| `services/api-client.ts` | Add isRefreshing, fix response parsing |
| `pages/Login.tsx` | Add Account Locked handling |
| `pages/Campaigns.tsx` | Use enums instead of strings |
| `pages/Users.tsx` | Use enums instead of strings |
| `components/layout/Sidebar.tsx` | Use UserRole enum |
| `components/ui/StatusBadge.tsx` | Refactor to use enum mapper |

---

## 8. Files to Keep (No Changes Needed)

| Path | Reason |
|------|--------|
| `contexts/ThemeContext.tsx` | next-themes integration, works well |
| `components/ui/*` | Shadcn components, auto-generated |
| `features/dashboard/*` | Already feature-based structure |

---

> **Next Step:** Run `pnpm add zustand` and start High Priority items.  
> **Estimated Effort:** 3-5 days for High Priority, 1-2 weeks total.
