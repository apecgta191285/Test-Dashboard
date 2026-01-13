// src/services/api-client.ts
// =============================================================================
// Axios API Client with Token Management
// Uses token-manager.ts to avoid circular dependency with auth-store
// =============================================================================

import axios, {
    AxiosInstance,
    AxiosError,
    InternalAxiosRequestConfig,
} from 'axios';
import {
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,
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
        // ✅ Use token-manager (no circular dependency)
        const token = getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// =============================================================================
// Response Interceptor (Auto Refresh Token + Auto Unwrap)
// =============================================================================
apiClient.interceptors.response.use(
    (response) => {
        // ✅ Auto-unwrap Standard API Response { success: true, data: [...] }
        // This prevents "data.map is not a function" errors across all services
        const responseData = response.data;

        // Check if this is a Standard Wrapped Response
        if (
            responseData &&
            typeof responseData === 'object' &&
            'success' in responseData &&
            'data' in responseData
        ) {
            // Validate success flag
            if (!responseData.success) {
                // If backend explicitly says success: false, reject with error
                const errorMessage =
                    responseData.message || responseData.error || 'API Error';
                return Promise.reject(new Error(errorMessage));
            }

            // ✅ Unwrap: Return inner data directly to services
            // Services will receive Array/Object directly, not { success, data }
            response.data = responseData.data;
        }

        // For blob/file downloads or non-standard responses, return as-is
        return response;
    },
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

                // ✅ Update tokens via token-manager
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

                // ✅ Clear tokens via token-manager
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
