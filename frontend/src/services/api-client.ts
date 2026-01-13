// src/services/api-client.ts
import axios, {
    AxiosInstance,
    AxiosError,
    InternalAxiosRequestConfig,
} from 'axios';
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
// Token Helpers (Lazy import to avoid circular dependency)
// =============================================================================
const getAccessToken = (): string | null => {
    // ✅ FIX: Import auth store lazily to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuthStore } = require('@/stores/auth-store');
    return useAuthStore.getState().accessToken || localStorage.getItem('accessToken');
};

const getRefreshToken = (): string | null => {
    const { useAuthStore } = require('@/stores/auth-store');
    return useAuthStore.getState().refreshToken || localStorage.getItem('refreshToken');
};

const setTokens = (access: string, refresh: string): void => {
    const { useAuthStore } = require('@/stores/auth-store');
    useAuthStore.getState().setTokens(access, refresh);
};

const performLogout = (): void => {
    const { useAuthStore } = require('@/stores/auth-store');
    useAuthStore.getState().logout();
};

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
        // ✅ FIX: Get token from Zustand store
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

                // ✅ Sprint 4 Standard: Backend returns { success, data: { accessToken, refreshToken } }
                const { accessToken, refreshToken: newRefreshToken } =
                    response.data.data;

                // ✅ FIX: Update tokens in Zustand store
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

                // ✅ FIX: Logout via Zustand store
                performLogout();

                // ✅ FIX: Dispatch event instead of hard reload
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
