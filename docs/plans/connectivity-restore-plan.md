# Connectivity Restore Plan

**Date:** 2026-01-13  
**Priority:** 🔴 Critical  
**Reference:** [Post-Refactor Audit Report](../reports/post-refactor-audit.md)

---

## Problem Summary

| Issue | Root Cause | Impact |
|-------|------------|--------|
| Circular Dependency | `auth-store.ts` ↔ `api-client.ts` | App fails to initialize, token helpers broken |
| `require()` in ESM | CommonJS syntax in Vite ES Modules | `getAccessToken()` throws/undefined |
| Port Collision | Both services default to port 3000 | Dev environment conflicts |

---

## Phase 1: Break Circular Dependency (Token Manager Pattern)

### 1.1 Architecture Design

**Current (Broken):**
```
auth-store.ts ──import──> api-client.ts
     ↑                         │
     └─────── require() ───────┘  ❌ Circular!
```

**Solution (Token Manager):**
```
┌──────────────────┐
│  token-manager.ts │  ← Standalone module (no dependencies)
│  - getToken()     │
│  - setToken()     │
│  - clearToken()   │
└────────┬─────────┘
         │
    ┌────┴────┐
    ↓         ↓
auth-store   api-client
    │             │
    └──────┬──────┘
           ↓
      No circular!
```

### 1.2 Implementation Steps

---

#### Step 1: Create Token Manager Module

**[NEW]** `frontend/src/lib/token-manager.ts`

```typescript
// src/lib/token-manager.ts
// Standalone token storage - NO imports from auth-store or api-client

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export interface TokenPair {
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store both tokens
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Clear all tokens (logout)
 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Check if user has valid token
 */
export function hasToken(): boolean {
  return !!getAccessToken();
}
```

---

#### Step 2: Refactor api-client.ts

**[MODIFY]** `frontend/src/services/api-client.ts`

**Remove:**
- Lines 26-46: Delete all `require()` based token helpers
- Remove import of `dispatchSessionExpired` (will re-add properly)

**Replace with:**

```typescript
// src/services/api-client.ts
import axios, {
    AxiosInstance,
    AxiosError,
    InternalAxiosRequestConfig,
} from 'axios';
import { 
    getAccessToken, 
    getRefreshToken, 
    setTokens, 
    clearTokens 
} from '@/lib/token-manager';
import { dispatchSessionExpired } from '@/lib/auth-events';

const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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
        // ✅ FIX: Use token-manager (no circular dependency)
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
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

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

                // Sprint 4 Standard: Backend returns { success, data: { accessToken, refreshToken } }
                const { accessToken, refreshToken: newRefreshToken } =
                    response.data.data;

                // ✅ FIX: Update tokens via token-manager
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

                // ✅ FIX: Clear tokens via token-manager
                clearTokens();

                // Dispatch event for React to handle navigation
                dispatchSessionExpired();

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
export interface StandardApiResponse<T> {
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

export function extractApiData<T>(response: {
    data: StandardApiResponse<T>;
}): T {
    if (!response.data.success) {
        throw new Error(
            response.data.message || response.data.error || 'API Error'
        );
    }
    return response.data.data;
}
```

---

#### Step 3: Refactor auth-store.ts

**[MODIFY]** `frontend/src/stores/auth-store.ts`

**Changes:**
1. Import from `token-manager` instead of duplicating localStorage calls
2. Remove `setTokens` action (use token-manager directly)
3. Remove circular dependency with api-client

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/api';
import { apiClient } from '@/services/api-client';
import { authEvents, AUTH_EVENTS } from '@/lib/auth-events';
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '@/lib/token-manager';

// ... (keep existing type definitions)

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial State
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: false,
            error: null,

            // Login Action
            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await apiClient.post('/auth/login', {
                        email,
                        password,
                    });

                    const { accessToken, refreshToken, user } = response.data.data;

                    // ✅ Use token-manager
                    setTokens(accessToken, refreshToken);

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: any) {
                    // ... (keep existing error handling)
                }
            },

            // Register Action
            register: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await apiClient.post('/auth/register', data);
                    const { accessToken, refreshToken, user } = response.data.data;

                    // ✅ Use token-manager
                    setTokens(accessToken, refreshToken);

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: any) {
                    // ... (keep existing error handling)
                }
            },

            // Logout Action
            logout: () => {
                // ✅ Use token-manager
                clearTokens();
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            // Set User
            setUser: (user) => set({ user, isAuthenticated: !!user }),

            // Clear Error
            clearError: () => set({ error: null }),

            // Initialize Auth (called on app mount)
            initializeAuth: () => {
                // ✅ Read from token-manager
                const accessToken = getAccessToken();
                const refreshToken = getRefreshToken();
                const { user } = get();

                if (accessToken && user) {
                    set({
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isInitialized: true,
                    });
                } else {
                    set({
                        accessToken: null,
                        refreshToken: null,
                        user: null,
                        isAuthenticated: false,
                        isInitialized: true,
                    });
                }
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                // ✅ Don't persist tokens - token-manager handles this
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => {
                return (state: AuthState | undefined) => {
                    if (state) {
                        // ✅ Sync tokens from token-manager on rehydrate
                        state.accessToken = getAccessToken();
                        state.refreshToken = getRefreshToken();
                        state.isInitialized = true;
                    }
                };
            },
        }
    )
);

// Subscribe to session expired events from api-client
authEvents.on(AUTH_EVENTS.SESSION_EXPIRED, () => {
    useAuthStore.getState().logout();
});

// ... (keep existing selectors)
```

---

## Phase 2: Fix Port & CORS Configuration

### 2.1 Port Standard

| Service | Port | Reason |
|---------|------|--------|
| Backend (NestJS) | `3000` | Standard API port |
| Frontend (Vite) | `5173` | Vite default, avoids collision |

### 2.2 Implementation Steps

---

#### Step 1: Update vite.config.ts

**[MODIFY]** `frontend/vite.config.ts`

```typescript
// Line 26-28: Change from
server: {
  port: 3000,
  strictPort: false,

// To:
server: {
  port: 5173,
  strictPort: true,  // ✅ Fail if port is busy (no silent switch)
```

---

#### Step 2: Update Frontend .env

**[MODIFY]** `frontend/.env`

```bash
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1
```

---

#### Step 3: Update Backend CORS (Optional Enhancement)

**[MODIFY]** `backend/src/main.ts`

```typescript
// Line 46: Add port 5173 to default origins
const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:3001';
```

---

## Phase 3: Cleanup

### 3.1 Remove Unused Files

**[DELETE]** `frontend/src/services/auth-service.ts`
- ไม่ได้ใช้งานแล้ว (auth-store calls apiClient directly)

---

## Verification Plan

### Automated Tests

```bash
# 1. Run existing unit tests (if any)
cd frontend && npm test

# 2. TypeScript compilation check
cd frontend && npx tsc --noEmit
```

### Manual Verification Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start Backend: `cd backend && npm run start:dev` | Server runs on port 3000 |
| 2 | Start Frontend: `cd frontend && npm run dev` | Vite runs on port 5173 |
| 3 | Open Browser: `http://localhost:5173/login` | Login page loads |
| 4 | Open DevTools → Network Tab | Ready to monitor requests |
| 5 | Enter credentials and click Login | See POST `/api/v1/auth/login` with 200 OK |
| 6 | Check Response | Contains `accessToken`, `refreshToken`, `user` |
| 7 | Navigate to `/dashboard` | Dashboard loads with data |
| 8 | Check Request Headers | `Authorization: Bearer <token>` present |
| 9 | Refresh page | User stays logged in |

### Debug Checklist

```javascript
// Browser Console - Check token storage
console.log('Access Token:', localStorage.getItem('accessToken'));
console.log('Refresh Token:', localStorage.getItem('refreshToken'));

// Check Zustand state
import { useAuthStore } from '@/stores/auth-store';
console.log('Auth State:', useAuthStore.getState());
```

---

## Files Changed Summary

| File | Action | Change Description |
|------|--------|-------------------|
| `src/lib/token-manager.ts` | **NEW** | Standalone token storage module |
| `src/services/api-client.ts` | MODIFY | Use token-manager, remove require() |
| `src/stores/auth-store.ts` | MODIFY | Use token-manager, simplify |
| `vite.config.ts` | MODIFY | Port 5173, strictPort: true |
| `frontend/.env` | MODIFY | VITE_API_URL |
| `backend/src/main.ts` | MODIFY | Add 5173 to CORS |
| `src/services/auth-service.ts` | DELETE | Unused |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Zustand persist conflicts | Clear localStorage before testing |
| Token sync issues | token-manager is single source of truth |
| Other files using old pattern | Grep for `require.*auth-store` to find all occurrences |

---

## Rollback Plan

หากมีปัญหา สามารถ revert ด้วย:
```bash
git checkout HEAD~1 -- frontend/src/services/api-client.ts
git checkout HEAD~1 -- frontend/src/stores/auth-store.ts
```

---

> **Estimated Implementation Time:** 1-2 hours  
> **Approval Required:** Yes (Architectural change)
