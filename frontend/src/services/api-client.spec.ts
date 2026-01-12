/**
 * API Client Interceptor Tests
 * @module api-client.spec
 * @description Tests for Axios interceptor - token refresh on 401
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const locationMock = { href: '' };
Object.defineProperty(global, 'window', { value: { location: locationMock }, writable: true });

let apiClient: any;
let extractApiData: any;

const resetModule = async () => {
    vi.resetModules();
    localStorageMock.clear();
    locationMock.href = '';
    const module = await import('./api-client');
    apiClient = module.apiClient;
    extractApiData = module.extractApiData;
};

describe('API Client Interceptor', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        await resetModule();
    });

    afterEach(() => { vi.restoreAllMocks(); });

    describe('Request Interceptor', () => {
        it('should add Authorization header when token exists', async () => {
            localStorageMock.setItem('accessToken', 'valid-token');
            const interceptors = apiClient.interceptors.request.handlers;
            const requestInterceptor = interceptors[0]?.fulfilled;

            if (requestInterceptor) {
                const config: InternalAxiosRequestConfig = { headers: {} as any, url: '/test', method: 'get' };
                const result = await requestInterceptor(config);
                expect(result.headers.Authorization).toBe('Bearer valid-token');
            }
        });
    });

    describe('401 Response Handling', () => {
        it('should call /auth/refresh on 401', async () => {
            localStorageMock.setItem('accessToken', 'expired');
            localStorageMock.setItem('refreshToken', 'valid-refresh');

            const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
                data: { success: true, data: { accessToken: 'new-access', refreshToken: 'new-refresh' } },
            });

            const interceptors = apiClient.interceptors.response.handlers;
            const responseInterceptor = interceptors[0]?.rejected;

            if (responseInterceptor) {
                const error: AxiosError = {
                    config: { headers: {} as any, url: '/test' } as any,
                    response: { status: 401 } as any,
                    isAxiosError: true, message: 'Unauthorized', name: 'AxiosError', toJSON: () => ({}),
                };

                vi.spyOn(apiClient, 'request').mockResolvedValueOnce({ data: { success: true } });
                try { await responseInterceptor(error); } catch (e) { }
                expect(refreshSpy).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), { refreshToken: 'valid-refresh' });
            }
        });

        it('should update tokens after successful refresh', async () => {
            localStorageMock.setItem('accessToken', 'expired');
            localStorageMock.setItem('refreshToken', 'valid-refresh');

            vi.spyOn(axios, 'post').mockResolvedValueOnce({
                data: { success: true, data: { accessToken: 'new-access', refreshToken: 'new-refresh' } },
            });

            const interceptors = apiClient.interceptors.response.handlers;
            const responseInterceptor = interceptors[0]?.rejected;

            if (responseInterceptor) {
                const error: AxiosError = {
                    config: { headers: {} as any, url: '/test' } as any,
                    response: { status: 401 } as any,
                    isAxiosError: true, message: 'Unauthorized', name: 'AxiosError', toJSON: () => ({}),
                };

                vi.spyOn(apiClient, 'request').mockResolvedValueOnce({ data: { success: true } });
                try { await responseInterceptor(error); } catch (e) { }
                expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'new-access');
                expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh');
            }
        });

        it('should clear tokens and redirect on refresh failure', async () => {
            localStorageMock.setItem('accessToken', 'expired');
            localStorageMock.setItem('refreshToken', 'invalid');

            vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Refresh failed'));

            const interceptors = apiClient.interceptors.response.handlers;
            const responseInterceptor = interceptors[0]?.rejected;

            if (responseInterceptor) {
                const error: AxiosError = {
                    config: { headers: {} as any, url: '/test' } as any,
                    response: { status: 401 } as any,
                    isAxiosError: true, message: 'Unauthorized', name: 'AxiosError', toJSON: () => ({}),
                };

                try { await responseInterceptor(error); } catch (e) { }
                expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
                expect(locationMock.href).toBe('/login?expired=true');
            }
        });
    });

    describe('extractApiData', () => {
        it('should return data.data when success is true', async () => {
            await resetModule();
            const response = { data: { success: true, data: { id: '123' } } };
            expect(extractApiData(response)).toEqual({ id: '123' });
        });

        it('should throw error when success is false', async () => {
            await resetModule();
            const response = { data: { success: false, data: null, message: 'Error' } };
            expect(() => extractApiData(response)).toThrow('Error');
        });
    });
});
