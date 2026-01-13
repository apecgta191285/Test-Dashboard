# 🛠️ UX Refactor Plan

**Project:** RGA Marketing Dashboard  
**Date:** 2025-01-13  
**Author:** Technical Lead & Frontend Architect  
**Based On:** [ux-stability-audit.md](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/docs/audits/ux-stability-audit.md)

---

## 📋 Overview

แผนการแก้ไขนี้แบ่งเป็น **2 Phases** เพื่อให้แก้ปัญหา Critical ก่อน แล้วค่อย Migrate Architecture:

| Phase | Goal | Risk Level | Estimated Effort |
|-------|------|------------|------------------|
| Phase 1 | 🩹 Critical Hotfixes - หยุดการกระพริบทันที | Low | 1-2 ชั่วโมง |
| Phase 2 | 🏗️ Architecture Migration - ย้ายไป Zustand | Medium | 4-6 ชั่วโมง |

---

## Phase 1: 🩹 Critical Hotfixes

> [!IMPORTANT]
> **เป้าหมาย:** แก้ให้ Login ทำงานได้ถูกต้อง และหยุด Hard Reload ทันที

### 1.1 Fix Data Extraction in AuthContext

**Target:** `src/contexts/AuthContext.tsx`  
**Defect ID:** DEF-001

#### Checklist:
- [ ] แก้ไข `login` function (Lines 58-75)
- [ ] แก้ไข `register` function (Lines 39-56)
- [ ] เพิ่ม `refreshToken` storage

#### Current Code (WRONG):
```typescript
// AuthContext.tsx:62-67
const response = await authService.login({ email, password });
const { accessToken, user: userData } = response.data;  // ❌

localStorage.setItem('accessToken', accessToken);
localStorage.setItem('user', JSON.stringify(userData));
```

#### Fixed Code:
```typescript
// AuthContext.tsx - login function
const login = async (email: string, password: string) => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await authService.login({ email, password });
    
    // ✅ FIX: Extract from response.data.data (not response.data)
    const { accessToken, refreshToken, user: userData } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);  // ✅ NEW: Save refresh token
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  } catch (err: any) {
    const message = err.response?.data?.message || 'Login failed';
    setError(message);
    throw err;
  } finally {
    setIsLoading(false);
  }
};
```

#### Same Fix for Register:
```typescript
// AuthContext.tsx - register function
const register = async (email: string, password: string, name: string, companyName: string) => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await authService.register({ email, password, name, companyName });
    
    // ✅ FIX: Extract from response.data.data
    const { accessToken, refreshToken, user: userData } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);  // ✅ NEW
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  } catch (err: any) {
    const message = err.response?.data?.message || 'Registration failed';
    setError(message);
    throw err;
  } finally {
    setIsLoading(false);
  }
};
```

---

### 1.2 Replace Hard Reload with Soft Navigation

**Target:** `src/services/api-client.ts`  
**Defect ID:** DEF-002

#### Checklist:
- [ ] สร้าง Auth Event Emitter
- [ ] แทนที่ `window.location.href` ด้วย Event Dispatch
- [ ] สร้าง Hook ให้ App.tsx listen auth events

#### Strategy: ใช้ Custom Event แทน Hard Reload

**Step 1: สร้าง Auth Events (ไฟล์ใหม่)**

```typescript
// src/lib/auth-events.ts (NEW FILE)

// Custom event types
export const AUTH_EVENTS = {
  SESSION_EXPIRED: 'auth:session-expired',
  LOGOUT_REQUIRED: 'auth:logout-required',
} as const;

// Dispatch session expired event
export function dispatchSessionExpired() {
  window.dispatchEvent(new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED));
}

// Hook to listen for auth events
export function useAuthEventListener(
  onSessionExpired: () => void
) {
  useEffect(() => {
    const handleSessionExpired = () => onSessionExpired();
    
    window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    
    return () => {
      window.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    };
  }, [onSessionExpired]);
}
```

**Step 2: Update api-client.ts**

```typescript
// api-client.ts - BEFORE (Lines 126-136)
} catch (refreshError) {
  processQueue(refreshError as Error, null);
  clearTokens();
  
  // ❌ REMOVE THIS
  if (typeof window !== 'undefined') {
    window.location.href = '/login?expired=true';
  }
  
  return Promise.reject(refreshError);
}
```

```typescript
// api-client.ts - AFTER
import { dispatchSessionExpired } from '@/lib/auth-events';

// In the catch block:
} catch (refreshError) {
  processQueue(refreshError as Error, null);
  clearTokens();
  
  // ✅ Dispatch event instead of hard reload
  dispatchSessionExpired();
  
  return Promise.reject(refreshError);
} finally {
  isRefreshing = false;
}
```

**Step 3: Handle Event in App.tsx**

```typescript
// App.tsx - Add near the top of App function
import { useAuthEventListener } from '@/lib/auth-events';
import { useLocation } from 'wouter';

function App() {
  const [, setLocation] = useLocation();
  
  // Handle session expiry without hard reload
  useAuthEventListener(() => {
    // Clear any remaining state
    useAuthStore.getState().logout();
    // Soft navigation to login
    setLocation('/login?expired=true');
  });
  
  return (
    // ... existing JSX
  );
}
```

---

### 1.3 Improve Login Error Handling

**Target:** `src/pages/Login.tsx`  
**Priority:** Medium

#### Checklist:
- [ ] เพิ่ม Toast notification สำหรับ errors
- [ ] Handle account locked scenario
- [ ] เพิ่ม retry limit indicator

#### Enhanced Error Handling:
```typescript
// Login.tsx - Enhanced handleSubmit
import { toast } from 'sonner';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    await login(email, password);
    toast.success('Login successful!');
    setLocation('/dashboard');
  } catch (err: any) {
    const errorData = err.response?.data;
    
    // Handle specific error types
    if (errorData?.error === 'ACCOUNT_LOCKED') {
      const message = `Account locked. Please try again in ${errorData.lockoutMinutes || 15} minutes.`;
      setError(message);
      toast.error(message);
    } else if (errorData?.remainingAttempts !== undefined) {
      const message = `Invalid credentials. ${errorData.remainingAttempts} attempts remaining.`;
      setError(message);
      toast.warning(message);
    } else {
      const message = errorData?.message || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    }
  } finally {
    setIsLoading(false);
  }
};
```

---

## Phase 2: 🏗️ Architecture Migration

> [!WARNING]
> **เป้าหมาย:** ย้ายจาก `AuthContext` ไปใช้ `Zustand` ทั้งหมด เพื่อลด Re-renders

### 2.1 Enhance auth-store.ts

**Target:** `src/stores/auth-store.ts`

#### Checklist:
- [ ] เพิ่ม `initializeAuth` function
- [ ] แก้ไข `checkAuth` ให้ใช้ persist data
- [ ] เพิ่ม selectors สำหรับ performance

#### Enhanced Store Structure:
```typescript
// src/stores/auth-store.ts - ENHANCED VERSION
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/api';
import { apiClient } from '@/services/api-client';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;  // ✅ NEW: track if auth check completed
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
  initializeAuth: () => void;  // ✅ NEW: called on app mount
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
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
          
          if (error.response?.data?.error === 'ACCOUNT_LOCKED') {
            set({
              error: 'Account is locked. Please try again later.',
              isLoading: false,
            });
          } else {
            set({ error: message, isLoading: false });
          }
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

      // ✅ NEW: Initialize auth on app mount
      initializeAuth: () => {
        const token = localStorage.getItem('accessToken');
        const { user } = get();
        
        if (token && user) {
          set({ isAuthenticated: true, isInitialized: true });
        } else {
          set({ isAuthenticated: false, user: null, isInitialized: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ✅ Selectors for optimized re-renders
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectIsInitialized = (state: AuthState) => state.isInitialized;
export const selectError = (state: AuthState) => state.error;
```

---

### 2.2 Migrate Components to Zustand

#### Migration Table:

| File | Current | Action |
|------|---------|--------|
| `Login.tsx` | `useAuth()` | Replace with `useAuthStore` |
| `Register.tsx` | `useAuth()` | Replace with `useAuthStore` |
| `ProtectedRoute.tsx` | `useAuth()` | Replace with `useAuthStore` + selectors |
| `DashboardShell.tsx` | `useAuth()` | Replace with `useAuthStore` + selectors |
| `Sidebar.tsx` | `useAuth()` | Replace with `useAuthStore` |
| `NotFound.tsx` | `useAuth()` | Replace with `useAuthStore` |

#### Example: ProtectedRoute Migration

```typescript
// src/components/ProtectedRoute.tsx - BEFORE
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  // ...
}
```

```typescript
// src/components/ProtectedRoute.tsx - AFTER
import { useAuthStore, selectIsAuthenticated, selectUser, selectIsLoading, selectIsInitialized } from '@/stores/auth-store';
import { useLocation } from 'wouter';

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  // ✅ Use selectors for optimized re-renders
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore(selectUser);
  const isLoading = useAuthStore(selectIsLoading);
  const isInitialized = useAuthStore(selectIsInitialized);
  const [, setLocation] = useLocation();

  // Wait for auth initialization
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    setLocation('/dashboard');
    return null;
  }

  return <>{children}</>;
}
```

#### Example: Login.tsx Migration

```typescript
// src/pages/Login.tsx - AFTER
import { useState } from 'react';
import { useAuthStore, selectIsLoading, selectError } from '@/stores/auth-store';
import { useLocation } from 'wouter';
// ... other imports

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [, setLocation] = useLocation();
  
  // ✅ Use Zustand store
  const login = useAuthStore((state) => state.login);
  const clearError = useAuthStore((state) => state.clearError);
  const isLoading = useAuthStore(selectIsLoading);
  const storeError = useAuthStore(selectError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    try {
      await login(email, password);
      setLocation('/dashboard');
    } catch (err: any) {
      setLocalError(err.response?.data?.message || 'Login failed.');
    }
  };

  const displayError = localError || storeError;
  
  // ... rest of component using displayError and isLoading
}
```

---

### 2.3 Update App.tsx

#### Checklist:
- [ ] ลบ `AuthProvider` wrapper
- [ ] เพิ่ม Auth initialization
- [ ] เพิ่ม Event Listener สำหรับ session expiry

```typescript
// src/App.tsx - AFTER MIGRATION
import { useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from '@/stores/auth-store';
import { useAuthEventListener } from '@/lib/auth-events';
// ... page imports

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [, setLocation] = useLocation();
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const logout = useAuthStore((state) => state.logout);

  // ✅ Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // ✅ Handle session expiry
  useAuthEventListener(() => {
    logout();
    setLocation('/login?expired=true');
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="light">
          {/* ❌ REMOVED: AuthProvider is no longer needed */}
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

---

### 2.4 Cleanup: Files to Delete

#### Checklist:
- [ ] Delete `src/contexts/AuthContext.tsx`
- [ ] Remove AuthContext import from `App.tsx`
- [ ] Verify no other files import from AuthContext

#### Verification Command:
```bash
# Search for any remaining AuthContext imports
grep -r "AuthContext" frontend/src --include="*.tsx" --include="*.ts"
```

---

## 🧪 Verification Plan

### Phase 1 Verification:

| Test | Command/Steps | Expected Result |
|------|---------------|-----------------|
| Login Success | Enter valid credentials | Redirect to `/dashboard` without reload |
| Login Failure | Enter wrong password | Error message displays, no page reload |
| Account Lock | Wrong password 5 times | "Account locked" message shows |
| Token Refresh | Wait for token expiry | Soft redirect to login, no hard reload |

### Phase 2 Verification:

| Test | Command/Steps | Expected Result |
|------|---------------|-----------------|
| Page Navigation | Click between Dashboard pages | No flickering, smooth transitions |
| Auth Persistence | Login, close tab, reopen | User remains logged in |
| Logout | Click logout button | Redirect to login, tokens cleared |
| Protected Route | Access `/dashboard` when logged out | Redirect to `/login` |

### Manual Testing Script:
```
1. เปิด Browser DevTools > Network tab
2. Login ด้วย credentials ที่ถูกต้อง
3. ตรวจสอบว่าไม่มี full page reload (page stays at same session)
4. ไปที่ Console > Application > Local Storage
5. ตรวจสอบว่ามี accessToken, refreshToken, และ auth-storage
6. Navigate ไปหน้าต่างๆ 3-4 หน้า
7. ตรวจสอบว่าไม่มี flickering
8. Logout แล้ว Login ใหม่ด้วยรหัสผิด
9. ตรวจสอบว่า Error message แสดงและไม่หายไป
```

---

## 📁 File Change Summary

| Action | File | Phase |
|--------|------|-------|
| **MODIFY** | `src/contexts/AuthContext.tsx` | 1 |
| **CREATE** | `src/lib/auth-events.ts` | 1 |
| **MODIFY** | `src/services/api-client.ts` | 1 |
| **MODIFY** | `src/pages/Login.tsx` | 1 & 2 |
| **MODIFY** | `src/stores/auth-store.ts` | 2 |
| **MODIFY** | `src/components/ProtectedRoute.tsx` | 2 |
| **MODIFY** | `src/components/layout/DashboardShell.tsx` | 2 |
| **MODIFY** | `src/components/layout/Sidebar.tsx` | 2 |
| **MODIFY** | `src/pages/Register.tsx` | 2 |
| **MODIFY** | `src/pages/NotFound.tsx` | 2 |
| **MODIFY** | `src/App.tsx` | 2 |
| **DELETE** | `src/contexts/AuthContext.tsx` | 2 (after migration) |

---

## ⚠️ Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Phase 1 breaks existing functionality | Test thoroughly before Phase 2 |
| Missing component migration | Use grep to find all `useAuth` imports |
| Token sync issues | Ensure api-client and store use same localStorage keys |
| Type errors after migration | Run `tsc --noEmit` before each commit |

---

## Next Steps

1. ✅ Review และ approve plan นี้
2. 🚀 เริ่ม Phase 1: Critical Hotfixes
3. 🧪 Test Phase 1 thoroughly
4. 🏗️ เริ่ม Phase 2: Architecture Migration
5. 🧹 Cleanup deprecated files
6. 📝 Update documentation
