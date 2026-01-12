# Frontend Refactoring Master Plan
> **Project:** RGA AI Dashboard  
> **Version:** Sprint 4 Alignment  
> **Created:** 2026-01-12  
> **Status:** Ready for Implementation

---

## 📋 Overview

เอกสารนี้เป็น **Step-by-Step Guide** สำหรับ Refactor Frontend ให้รองรับ Backend Sprint 4  
ทุก Code Snippet สามารถ **Copy-Paste** ได้ทันที

**Estimated Time:** 3-5 วัน (สำหรับ 1 Developer)

---

## Phase 1: Foundation (Day 1) 🏗️

### Step 1.1: Install Dependencies

```bash
cd frontend
pnpm add zustand
```

**Verify Installation:**
```bash
pnpm list zustand
# Should show: zustand 5.x.x
```

---

### Step 1.2: Create `types/enums.ts`

สร้างไฟล์ใหม่: `src/types/enums.ts`

```typescript
// src/types/enums.ts
// ⚠️ CRITICAL: Must match @prisma/client enums exactly!

// =============================================================================
// USER ROLES
// =============================================================================
export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CLIENT: 'CLIENT',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

// =============================================================================
// CAMPAIGN STATUS
// =============================================================================
export const CampaignStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DELETED: 'DELETED',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
} as const;
export type CampaignStatus = typeof CampaignStatus[keyof typeof CampaignStatus];

// =============================================================================
// AD PLATFORM
// =============================================================================
export const AdPlatform = {
  GOOGLE_ADS: 'GOOGLE_ADS',
  FACEBOOK: 'FACEBOOK',
  TIKTOK: 'TIKTOK',
  LINE_ADS: 'LINE_ADS',
  GOOGLE_ANALYTICS: 'GOOGLE_ANALYTICS',
} as const;
export type AdPlatform = typeof AdPlatform[keyof typeof AdPlatform];

// =============================================================================
// ALERT SEVERITY
// =============================================================================
export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = typeof AlertSeverity[keyof typeof AlertSeverity];

// =============================================================================
// ALERT STATUS
// =============================================================================
export const AlertStatus = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const;
export type AlertStatus = typeof AlertStatus[keyof typeof AlertStatus];

// =============================================================================
// NOTIFICATION CHANNEL
// =============================================================================
export const NotificationChannel = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  LINE: 'LINE',
  SMS: 'SMS',
} as const;
export type NotificationChannel = typeof NotificationChannel[keyof typeof NotificationChannel];

// =============================================================================
// SYNC STATUS
// =============================================================================
export const SyncStatus = {
  PENDING: 'PENDING',
  STARTED: 'STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];

// =============================================================================
// SYNC TYPE
// =============================================================================
export const SyncType = {
  INITIAL: 'INITIAL',
  SCHEDULED: 'SCHEDULED',
  MANUAL: 'MANUAL',
} as const;
export type SyncType = typeof SyncType[keyof typeof SyncType];

// =============================================================================
// ALERT RULE TYPE
// =============================================================================
export const AlertRuleType = {
  PRESET: 'PRESET',
  CUSTOM: 'CUSTOM',
} as const;
export type AlertRuleType = typeof AlertRuleType[keyof typeof AlertRuleType];
```

---

### Step 1.3: Update `types/api.ts`

เพิ่ม Sprint 4 fields และ Notification interface:

**เพิ่มที่ต้นไฟล์:**
```typescript
// src/types/api.ts (เพิ่มที่บรรทัดบนสุด)
import type { 
  UserRole, 
  CampaignStatus, 
  AdPlatform, 
  AlertSeverity,
  NotificationChannel 
} from './enums';
```

**แก้ไข User interface (แทนที่ทั้งหมด):**
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  title?: string | null;
  location?: string | null;
  team?: string | null;
  timezone?: string | null;
  language?: string | null;
  bio?: string | null;
  social?: Record<string, string> | null;
  role: UserRole;           // 🔄 Changed from string
  tenantId: string;
  tenant?: TenantInfo;
  companyName?: string;
  createdAt?: string;
  
  // 🆕 Sprint 4 Security Fields
  lastLoginAt?: string;
  lastLoginIp?: string;
  failedLoginCount?: number;
  lockedUntil?: string;
  twoFactorEnabled?: boolean;
  passwordChangedAt?: string;
  
  // 🆕 Preferences
  notificationPreferences?: Record<string, boolean>;
}
```

**แก้ไข Campaign interface:**
```typescript
export interface Campaign extends CampaignMetrics {
  id: string;
  tenantId?: string;
  integrationId?: string;
  externalId?: string;
  name: string;
  platform: AdPlatform;        // 🔄 Changed from string
  status: CampaignStatus;      // 🔄 Changed from string
  objective?: string;
  budget?: string | number;
  budgetType?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  lastSyncedAt?: string;
  syncStatus?: SyncStatus;     // 🆕 Added
  metrics?: CampaignMetrics;
}
```

**เพิ่ม Notification interface (เพิ่มท้ายไฟล์):**
```typescript
// =============================================================================
// 🆕 NOTIFICATION (Sprint 4)
// =============================================================================
export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  metadata?: {
    actionUrl?: string;
    actionText?: string;
    icon?: string;
    alertType?: string;
    severity?: AlertSeverity;
  };
  isRead: boolean;
  readAt?: string;
  isDismissed: boolean;
  alertId?: string;
  campaignId?: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  expiresAt?: string;
}
```

---

### Step 1.4: Fix `services/api-client.ts`

แทนที่ไฟล์ทั้งหมดด้วย:

```typescript
// src/services/api-client.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// =============================================================================
// Token Storage Helpers
// =============================================================================
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

// =============================================================================
// Axios Instance
// =============================================================================
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// =============================================================================
// Refresh Token Queue (Prevent Race Conditions)
// =============================================================================
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// =============================================================================
// Request Interceptor
// =============================================================================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =============================================================================
// Response Interceptor (Auto Refresh Token)
// =============================================================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 = Unauthorized, need to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
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
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Use axios directly to avoid interceptor loop
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // 🔧 FIX: Backend returns { success, data: { accessToken, refreshToken } }
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Update tokens
        setTokens(accessToken, newRefreshToken);

        // Process queued requests
        processQueue(null, accessToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);

      } catch (refreshError) {
        // Refresh failed - logout user
        processQueue(refreshError as Error, null);
        clearTokens();

        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login?expired=true';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// =============================================================================
// Helper: Extract API Data
// =============================================================================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export function extractApiData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.message || response.data.error || 'API Error');
  }
  return response.data.data;
}
```

---

## Phase 2: State Management Migration (Day 2) 🗄️

### Step 2.1: Create `stores/` Directory

```bash
mkdir -p src/stores
```

---

### Step 2.2: Create `stores/auth-store.ts`

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api';
import { apiClient } from '@/services/api-client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  companyName: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post('/auth/login', { email, password });
          const { accessToken, refreshToken, user } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post('/auth/register', data);
          const { accessToken, refreshToken, user } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          const message = error.response?.data?.message || 'Registration failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false, error: null });
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

---

### Step 2.3: Create `stores/notification-store.ts`

```typescript
// src/stores/notification-store.ts
import { create } from 'zustand';
import type { Notification } from '@/types/api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  setOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    })),

  markAsRead: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      if (!notification || notification.isRead) return state;

      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date().toISOString(),
      })),
      unreadCount: 0,
    })),

  dismiss: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      const wasUnread = notification && !notification.isRead;
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),

  setOpen: (open) => set({ isOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
```

---

### Step 2.4: Create `stores/ui-store.ts`

```typescript
// src/stores/ui-store.ts
import { create } from 'zustand';

interface DateRange {
  from: Date;
  to: Date;
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Date Range
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;

  // Loading States
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

// Default: Last 30 days
const getDefaultDateRange = (): DateRange => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to };
};

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Date Range
  dateRange: getDefaultDateRange(),
  setDateRange: (range) => set({ dateRange: range }),

  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
```

---

### Step 2.5: Create `stores/index.ts` (Optional Re-export)

```typescript
// src/stores/index.ts
export { useAuthStore } from './auth-store';
export { useNotificationStore } from './notification-store';
export { useUIStore } from './ui-store';
```

---

### Step 2.6: Migrate `ProtectedRoute.tsx`

แก้ไข `src/components/ProtectedRoute.tsx`:

```typescript
// src/components/ProtectedRoute.tsx
import { useLocation, Redirect } from 'wouter';
import { useAuthStore } from '@/stores/auth-store';
import { UserRole } from '@/types/enums';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Check role-based access
  if (requiredRoles && user && !requiredRoles.includes(user.role as UserRole)) {
    return <Redirect to="/unauthorized" />;
  }

  return <>{children}</>;
}
```

---

## Phase 3: Feature Implementation (Day 3) 🧩

### Step 3.1: Create `lib/enum-mappers.ts`

```typescript
// src/lib/enum-mappers.ts
import { 
  CampaignStatus, 
  AlertSeverity, 
  AdPlatform, 
  UserRole 
} from '@/types/enums';

// =============================================================================
// Campaign Status → Badge Config
// =============================================================================
export const campaignStatusConfig: Record<CampaignStatus, {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  icon: string;
}> = {
  [CampaignStatus.ACTIVE]: { label: 'Active', variant: 'success', icon: '🟢' },
  [CampaignStatus.PAUSED]: { label: 'Paused', variant: 'warning', icon: '⏸️' },
  [CampaignStatus.PENDING]: { label: 'Pending', variant: 'secondary', icon: '⏳' },
  [CampaignStatus.COMPLETED]: { label: 'Completed', variant: 'default', icon: '✅' },
  [CampaignStatus.DELETED]: { label: 'Deleted', variant: 'destructive', icon: '🗑️' },
};

// =============================================================================
// Alert Severity → Badge Config
// =============================================================================
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

// =============================================================================
// Ad Platform → Display Config
// =============================================================================
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

// =============================================================================
// User Role → Display Config
// =============================================================================
export const userRoleConfig: Record<UserRole, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
}> = {
  [UserRole.ADMIN]: { label: 'Admin', variant: 'destructive' },
  [UserRole.MANAGER]: { label: 'Manager', variant: 'default' },
  [UserRole.CLIENT]: { label: 'Client', variant: 'secondary' },
  [UserRole.VIEWER]: { label: 'Viewer', variant: 'secondary' },
};
```

---

### Step 3.2: Create `components/common/NotificationBell.tsx`

```typescript
// src/components/common/NotificationBell.tsx
import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/services/api-client';
import { useNotificationStore } from '@/stores/notification-store';
import { alertSeverityConfig } from '@/lib/enum-mappers';
import type { Notification } from '@/types/api';
import type { AlertSeverity } from '@/types/enums';

const POLL_INTERVAL = 30 * 1000; // 30 seconds

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { 
    notifications, 
    unreadCount, 
    setNotifications, 
    markAsRead 
  } = useNotificationStore();

  // Fetch notifications with polling
  const { isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications');
      return response.data.data as Notification[];
    },
    onSuccess: setNotifications,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: (_, id) => markAsRead(id),
  });

  // Mark all as read
  const markAllMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const severity = notification.metadata?.severity as AlertSeverity | undefined;
              const config = severity ? alertSeverityConfig[severity] : null;

              return (
                <div
                  key={notification.id}
                  className={`
                    px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer
                    ${!notification.isRead ? 'bg-muted/30' : ''}
                  `}
                  onClick={() => markAsReadMutation.mutate(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {notification.title}
                        </span>
                        {config && (
                          <Badge className={config.className} variant={config.variant}>
                            {config.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="ghost" className="w-full" asChild>
            <a href="/notifications">View all</a>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### Step 3.3: Update `Sidebar.tsx` to Use Enums

แก้ไขส่วนที่ check role:

```typescript
// ในไฟล์ src/components/layout/Sidebar.tsx

// เพิ่ม import
import { UserRole } from '@/types/enums';

// แก้ไขบรรทัดที่ check role (ประมาณบรรทัด 48)
// จาก:
...(user?.role === 'ADMIN' ? [{ label: 'Users', href: '/users', icon: Users }] : []),

// เป็น:
...(user?.role === UserRole.ADMIN ? [{ label: 'Users', href: '/users', icon: Users }] : []),
```

---

## Phase 4: Verification (Day 4-5) ✅

### Manual Testing Checklist

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **Login** | 1. Go to `/login` 2. Enter credentials 3. Click Submit | Redirect to `/dashboard`, user data shows in sidebar |
| **Token Persistence** | 1. Login 2. Refresh page (F5) | Should stay logged in, not redirect to login |
| **Token Refresh** | 1. Login 2. Wait 15+ mins 3. Make API call | Should auto-refresh token, no 401 error |
| **Logout** | 1. Click Logout button | Redirect to `/login`, localStorage cleared |
| **Protected Route** | 1. Logout 2. Try to access `/dashboard` directly | Redirect to `/login` |
| **Role Check** | 1. Login as CLIENT 2. Try to access `/users` | Should redirect to unauthorized or hide menu |
| **Notification Bell** | 1. Login 2. Look at header | Should see bell icon with unread count (if any) |
| **Notification Dropdown** | 1. Click bell icon | Should show notification list |

### TypeScript Check

```bash
cd frontend
pnpm run check
# Should complete with NO errors
```

### Build Check

```bash
pnpm run build
# Should complete successfully
```

---

## 📁 Files Summary

### New Files to Create

| Path | Purpose |
|------|---------|
| `src/types/enums.ts` | Prisma-matching enum constants |
| `src/stores/auth-store.ts` | Zustand auth state |
| `src/stores/notification-store.ts` | Zustand notification state |
| `src/stores/ui-store.ts` | Zustand UI state |
| `src/stores/index.ts` | Re-exports |
| `src/lib/enum-mappers.ts` | Enum to UI utilities |
| `src/components/common/NotificationBell.tsx` | Notification UI |

### Files to Modify

| Path | Changes |
|------|---------|
| `src/types/api.ts` | Add imports, Sprint 4 fields, Notification interface |
| `src/services/api-client.ts` | Complete rewrite with isRefreshing fix |
| `src/components/ProtectedRoute.tsx` | Use Zustand auth store |
| `src/components/layout/Sidebar.tsx` | Use UserRole enum |

---

## 🚀 Quick Start Commands

```bash
# Step 1: Install Zustand
cd frontend
pnpm add zustand

# Step 2: Create directories
mkdir -p src/stores src/lib src/components/common

# Step 3: TypeScript check after all changes
pnpm run check

# Step 4: Build test
pnpm run build

# Step 5: Dev server
pnpm run dev
```

---

> **Document Owner:** Lead Frontend Developer  
> **Approved By:** Tech Lead  
> **Ready for:** Implementation
