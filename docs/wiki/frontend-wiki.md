# Frontend Architecture Wiki: RGA AI Dashboard
> **Version:** 2.1 (Sprint 4 — Vite Edition)  
> **Stack:** Vite + React 18 + Wouter + Tailwind CSS + Shadcn UI  
> **Last Updated:** 2026-01-12

---

## ⚠️ ข้อบังคับสำหรับ Frontend Developer

> [!CAUTION]
> เอกสารนี้เป็น **กฎหมาย** ในการเขียนโค้ด Frontend  
> ทุก Pull Request ที่ไม่ปฏิบัติตามมาตรฐานในเอกสารนี้ **จะถูก Reject**

---

## 1. Technology Stack & Architecture 🏗️

### 1.1 Core Technologies

| Technology | Version | Usage |
|------------|---------|-------|
| **Vite** | 7.x | Build Tool & Dev Server |
| **React** | 18.x | UI Library |
| **TypeScript** | 5.x | Type Safety |
| **Wouter** | 3.x | Client-side Routing |
| **Tailwind CSS** | 4.x | Styling |
| **Shadcn UI** | Latest | Component Library (Radix-based) |
| **TanStack Query** | 4.x | Server State Management |
| **Zustand** | Latest | Global Client State |
| **Axios** | 1.x | HTTP Client |
| **Zod** | 4.x | Schema Validation |
| **React Hook Form** | 7.x | Form Management |
| **Sonner** | 2.x | Toast Notifications |
| **Recharts** | 2.x | Charts & Visualization |

> [!NOTE]
> **ทำไมใช้ Vite แทน Next.js?**
> - Dashboard เป็น Internal App ที่ต้อง Login → **ไม่ต้องการ SEO/SSR**
> - Backend แยกอยู่แล้ว (NestJS) → **ไม่ต้องการ API Routes**
> - Vite มี Dev Server ที่เร็วกว่า และ Build ง่ายกว่า

---

### 1.2 Directory Structure (Current Reality)

```
src/
├── pages/                        # 📱 Page Components (Wouter routes)
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Campaigns.tsx
│   ├── Users.tsx
│   ├── Settings.tsx
│   ├── Integrations.tsx
│   └── ...
│
├── components/                   # 🧩 Reusable Components
│   ├── ui/                       # Shadcn UI Components (auto-generated)
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MainLayout.tsx
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── ActiveChannelsWidget.tsx
│   │   ├── AnalyticsWidget.tsx
│   │   └── PlatformTabs.tsx
│   ├── integrations/             # Platform integration cards
│   │   ├── google-ads/
│   │   ├── facebook/
│   │   ├── tiktok/
│   │   └── line/
│   └── common/                   # Shared components (TODO: create)
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       └── NotificationBell.tsx  # 🆕 Sprint 4
│
├── features/                     # 📦 Feature Modules (Domain-driven)
│   ├── dashboard/                # ✅ Exists
│   │   ├── components/
│   │   ├── hooks/
│   │   └── ...
│   ├── auth/                     # 🔜 TODO: Create
│   ├── campaigns/                # 🔜 TODO: Create  
│   ├── notifications/            # 🔜 TODO: Create (Sprint 4)
│   └── alerts/                   # 🔜 TODO: Create
│
├── contexts/                     # 🔄 React Context (Legacy)
│   ├── AuthContext.tsx           # ⚠️ Migrate to Zustand
│   ├── DateRangeContext.tsx      # ⚠️ Migrate to Zustand
│   └── ThemeContext.tsx          # ✅ Keep (next-themes)
│
├── stores/                       # 🗄️ Zustand Stores (TODO: create)
│   ├── auth-store.ts             # 🆕 Auth state
│   ├── notification-store.ts     # 🆕 Notification state
│   └── ui-store.ts               # 🆕 UI state (sidebar, modals)
│
├── services/                     # 🌐 API Services
│   ├── api-client.ts             # Axios Instance + Interceptors
│   ├── auth-service.ts
│   ├── campaign-service.ts
│   ├── dashboard-service.ts
│   └── ...
│
├── lib/                          # 🔧 Utilities
│   ├── utils.ts                  # Helper functions (cn, formatters)
│   ├── enum-mappers.ts           # 🆕 Enum to UI mapping
│   └── error-handler.ts          # 🆕 Global error handling
│
├── types/                        # 📐 Type Definitions
│   ├── api.ts                    # API Response types
│   ├── enums.ts                  # 🆕 Must match Prisma Enums!
│   └── index.ts                  # Type exports
│
├── hooks/                        # 🪝 Custom Hooks
│   ├── useAlerts.ts
│   └── ...
│
├── App.tsx                       # Main App with Router
├── main.tsx                      # Entry point
└── index.css                     # Global styles
```

---

### 1.3 Routing (Wouter)

> [!IMPORTANT]
> โปรเจกต์ใช้ **Wouter** สำหรับ Client-side Routing (ไม่ใช่ React Router หรือ Next.js App Router)

```typescript
// App.tsx
import { Switch, Route } from 'wouter';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function App() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected Routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/campaigns" component={Campaigns} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/settings" component={Settings} />
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}
```

**Navigation:**
```typescript
import { useLocation } from 'wouter';

function MyComponent() {
  const [, setLocation] = useLocation();
  
  const handleClick = () => {
    setLocation('/dashboard');
  };
}
```

---

### 1.4 Feature Module Pattern

> [!IMPORTANT]
> **Co-location Principle:** ทุก Feature ต้องมีโครงสร้างที่สมบูรณ์ในตัวเอง

```
features/
└── campaigns/
    ├── components/           # Feature-specific UI
    │   ├── CampaignCard.tsx
    │   ├── CampaignTable.tsx
    │   ├── CampaignFilters.tsx
    │   └── CampaignForm.tsx
    ├── hooks/               # Feature-specific hooks
    │   ├── use-campaigns.ts      # TanStack Query hooks
    │   └── use-campaign-filters.ts
    ├── api.ts               # API calls for this feature
    ├── types.ts             # Feature-specific types
    └── index.ts             # Public exports
```

---

## 2. Integration Standards (Connecting to Backend) 🔗

### 2.1 Type Safety: Prisma Enum Alignment

> [!IMPORTANT]
> **บังคับ:** Types ทุกตัวต้องตรงกับ Prisma Schema เป๊ะๆ  
> แนะนำให้ Generate Types อัตโนมัติหรือ Sync จาก Backend

**Available Enums (Must Match Backend):**

```typescript
// types/enums.ts
// ⚠️ CRITICAL: These MUST match @prisma/client enums exactly!

// User Roles
export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CLIENT: 'CLIENT',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

// Campaign Status
export const CampaignStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DELETED: 'DELETED',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
} as const;
export type CampaignStatus = typeof CampaignStatus[keyof typeof CampaignStatus];

// Ad Platform
export const AdPlatform = {
  GOOGLE_ADS: 'GOOGLE_ADS',
  FACEBOOK: 'FACEBOOK',
  TIKTOK: 'TIKTOK',
  LINE_ADS: 'LINE_ADS',
  GOOGLE_ANALYTICS: 'GOOGLE_ANALYTICS',
} as const;
export type AdPlatform = typeof AdPlatform[keyof typeof AdPlatform];

// Alert Severity
export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = typeof AlertSeverity[keyof typeof AlertSeverity];

// Alert Status
export const AlertStatus = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const;
export type AlertStatus = typeof AlertStatus[keyof typeof AlertStatus];

// Notification Channel
export const NotificationChannel = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  LINE: 'LINE',
  SMS: 'SMS',
} as const;
export type NotificationChannel = typeof NotificationChannel[keyof typeof NotificationChannel];

// Sync Status
export const SyncStatus = {
  PENDING: 'PENDING',
  STARTED: 'STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];
```

---

### 2.2 Enum to UI Mapping

> [!TIP]
> ใช้ Utility Functions เพื่อ Map Enum เป็น UI Elements ที่สวยงาม

```typescript
// lib/enum-mappers.ts
import { Badge } from '@/components/ui/badge';
import { CampaignStatus, AlertSeverity, AdPlatform } from '@/types/enums';

// ===== Campaign Status Mapping =====
export const campaignStatusConfig: Record<CampaignStatus, {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  icon?: string;
}> = {
  [CampaignStatus.ACTIVE]: {
    label: 'Active',
    variant: 'success',
    icon: '🟢',
  },
  [CampaignStatus.PAUSED]: {
    label: 'Paused',
    variant: 'warning',
    icon: '⏸️',
  },
  [CampaignStatus.PENDING]: {
    label: 'Pending',
    variant: 'secondary',
    icon: '⏳',
  },
  [CampaignStatus.COMPLETED]: {
    label: 'Completed',
    variant: 'default',
    icon: '✅',
  },
  [CampaignStatus.DELETED]: {
    label: 'Deleted',
    variant: 'destructive',
    icon: '🗑️',
  },
};

// ===== Usage Component =====
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config = campaignStatusConfig[status];
  return (
    <Badge variant={config.variant}>
      {config.icon} {config.label}
    </Badge>
  );
}

// ===== Alert Severity Mapping =====
export const alertSeverityConfig: Record<AlertSeverity, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
  className: string;
}> = {
  [AlertSeverity.INFO]: {
    label: 'Info',
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  [AlertSeverity.WARNING]: {
    label: 'Warning',
    variant: 'default',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  [AlertSeverity.CRITICAL]: {
    label: 'Critical',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
};

// ===== Platform Config =====
export const platformConfig: Record<AdPlatform, {
  name: string;
  icon: string;
  color: string;
}> = {
  [AdPlatform.GOOGLE_ADS]: { name: 'Google Ads', icon: '🔍', color: '#4285F4' },
  [AdPlatform.FACEBOOK]: { name: 'Facebook', icon: '📘', color: '#1877F2' },
  [AdPlatform.TIKTOK]: { name: 'TikTok', icon: '🎵', color: '#000000' },
  [AdPlatform.LINE_ADS]: { name: 'LINE Ads', icon: '💬', color: '#00B900' },
  [AdPlatform.GOOGLE_ANALYTICS]: { name: 'Google Analytics', icon: '📊', color: '#E37400' },
};
```

---

### 2.3 API Client with Refresh Token Flow

> [!IMPORTANT]
> **Axios Interceptor** จะจัดการ Token Refresh อัตโนมัติเมื่อได้รับ 401

```typescript
// services/api-client.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Token storage helpers
const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
};
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Create Axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve(token);
  });
  failedQueue = [];
};

// Request Interceptor
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor (Auto Refresh)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        clearTokens();
        window.location.href = '/login?expired=true';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

### 2.3.1 Token Manager Pattern

> [!IMPORTANT]
> เราใช้ **Token Manager Pattern** เพื่อแก้ปัญหา Circular Dependency ระหว่าง `api-client.ts` และ `auth-store.ts`

**Architecture:**
```
┌──────────────────┐
│  token-manager.ts │  ← Standalone (NO dependencies)
│  - getAccessToken │
│  - setTokens      │
│  - clearTokens    │
└────────┬─────────┘
         │
    ┌────┴────┐
    ↓         ↓
auth-store   api-client
```

**File Location:** `src/lib/token-manager.ts`

```typescript
// ✅ CORRECT - Import from token-manager
import { getAccessToken, setTokens, clearTokens } from '@/lib/token-manager';

// ❌ WRONG - Never import auth-store in api-client (causes circular dependency)
import { useAuthStore } from '@/stores/auth-store';
```

**Rules:**
1. `token-manager.ts` must **NEVER** import from `auth-store` or `api-client`
2. Use `token-manager` for **all** localStorage token operations
3. `auth-store` syncs its state from `token-manager` on rehydrate
4. `api-client` reads tokens from `token-manager` for Authorization header

**Benefits:**
- ✅ No circular dependency
- ✅ Single source of truth for tokens
- ✅ Tree-shakeable (pure functions)
- ✅ Easy to test

---

### 2.4 Standard API Response Handling

```typescript
// types/api-response.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

// Helper function
export function extractApiData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success || response.data.data === null) {
    throw new Error(response.data.message || response.data.error || 'Unknown error');
  }
  return response.data.data;
}
```

---

## 3. Key Feature Implementation 🧩

### 3.1 Auth Guard (ProtectedRoute Component)

> [!IMPORTANT]
> ใช้ **ProtectedRoute** component สำหรับป้องกัน Route ที่ต้อง Login

```typescript
// components/ProtectedRoute.tsx
import { Route, Redirect, RouteProps } from 'wouter';
import { useAuth } from '@/contexts/AuthContext'; // or useAuthStore

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType;
  requiredRoles?: string[];
}

export function ProtectedRoute({ 
  component: Component, 
  requiredRoles,
  ...rest 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Role-based access control
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Redirect to="/unauthorized" />;
  }

  return <Route {...rest} component={Component} />;
}

// Usage
<ProtectedRoute path="/users" component={Users} requiredRoles={['ADMIN']} />
```

---

### 3.2 Notification UI (Sprint 4)

**Zustand Store:**

```typescript
// stores/notification-store.ts
import { create } from 'zustand';
import type { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  setOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  }),

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
  })),

  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),

  dismiss: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),

  setOpen: (open) => set({ isOpen: open }),
}));
```

---

### 3.3 Error Handling with Sonner

```typescript
// lib/error-handler.ts
import { toast } from 'sonner';
import type { AxiosError } from 'axios';

interface ApiError {
  success: false;
  error: string;
  message: string;
}

export function handleApiError(error: unknown, fallbackMessage = 'An error occurred') {
  const axiosError = error as AxiosError<ApiError>;
  const apiError = axiosError.response?.data;

  switch (apiError?.error) {
    case 'ACCOUNT_LOCKED':
      toast.error('Account Locked', { description: 'Please contact support.' });
      break;
    case 'UNAUTHORIZED':
      toast.error('Session Expired', { description: 'Please log in again.' });
      break;
    case 'VALIDATION_ERROR':
      toast.error('Validation Error', { description: apiError.message });
      break;
    default:
      toast.error(apiError?.message || fallbackMessage);
  }
}

export const showSuccess = (title: string, description?: string) => 
  toast.success(title, { description });

export const showWarning = (title: string, description?: string) => 
  toast.warning(title, { description });
```

---

## 4. Styling Standards 🎨

### 4.1 Tailwind CSS + Shadcn UI

```typescript
// ✅ CORRECT - Use Tailwind classes
<div className="flex items-center gap-4 p-6 rounded-lg bg-card shadow-sm">
  <Avatar>
    <AvatarImage src={user.avatarUrl} />
    <AvatarFallback>{user.name[0]}</AvatarFallback>
  </Avatar>
</div>

// ❌ WRONG - Inline styles
<div style={{ display: 'flex', padding: '24px' }}>
  ...
</div>
```

### 4.2 Import Order

```typescript
// 1. React imports
import { useState, useEffect } from 'react';

// 2. Third-party imports
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

// 3. UI Components (Shadcn)
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 4. Internal components
import { CampaignCard } from '../components/CampaignCard';

// 5. Utilities and types
import { cn } from '@/lib/utils';
import type { Campaign } from '@/types';
```

---

## 5. Quick Reference

### File Naming Convention

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CampaignCard.tsx` |
| Hooks | camelCase with `use-` | `use-campaigns.ts` |
| Utilities | camelCase | `formatters.ts` |
| Types | camelCase | `api.ts`, `enums.ts` |
| Stores | kebab-case with `-store` | `auth-store.ts` |

### Environment Variables

```bash
# .env
VITE_API_URL=http://localhost:3000/api/v1
```

```typescript
// Usage in code
const apiUrl = import.meta.env.VITE_API_URL;
```

---

> **Document Owner:** Senior Frontend Architect  
> **Enforcement:** All Code Reviews  
> **Violations:** PR will be rejected

