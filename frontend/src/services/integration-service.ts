import { apiClient } from './api-client';

/**
 * Integration Service
 * 
 * Centralized service for all platform integration operations.
 * Provides status checking, connection, and disconnection methods.
 */

// ============================================
// Types
// ============================================

export interface TikTokAccount {
    id: string;
    name: string;
    status?: string;
}

export interface TikTokAuthUrlResponse {
    isSandbox: boolean;
    url?: string;
    message?: string;
    connectEndpoint?: string;
}

export interface TikTokTempAccountsResponse {
    success: boolean;
    accounts: TikTokAccount[];
    count: number;
}

export interface TikTokCompleteResponse {
    success: boolean;
    accountId: string;
    accountName?: string;
}

// ============================================
// Service Methods
// ============================================

export const integrationService = {
    // ============================================
    // Status Endpoints
    // ============================================
    getGoogleAdsStatus: () => apiClient.get('/integrations/google-ads/status'),
    getGoogleAnalyticsStatus: () => apiClient.get('/auth/google/analytics/status'),
    getLineAdsStatus: () => apiClient.get('/integrations/line-ads/status'),
    getTikTokAdsStatus: () => apiClient.get('/integrations/tiktok-ads/status'),

    // ============================================
    // Google Ads
    // ============================================
    syncGoogleAds: () => apiClient.post('/integrations/google-ads/sync'),
    disconnectGoogleAds: () => apiClient.delete('/integrations/google-ads'),

    // ============================================
    // Google Analytics
    // ============================================
    disconnectGoogleAnalytics: () => apiClient.delete('/integrations/google-analytics'),

    // ============================================
    // LINE Ads
    // ============================================
    disconnectLineAds: () => apiClient.delete('/integrations/line-ads'),

    // ============================================
    // TikTok Ads
    // ============================================

    /**
     * Get TikTok OAuth URL or sandbox mode info
     */
    getTikTokAuthUrl: () =>
        apiClient.get<TikTokAuthUrlResponse>('/auth/tiktok/url'),

    /**
     * Connect TikTok sandbox account (when in sandbox mode)
     */
    connectTikTokSandbox: () =>
        apiClient.post<TikTokCompleteResponse>('/auth/tiktok/connect-sandbox'),

    /**
     * Get temporary accounts for selection after OAuth callback
     */
    getTikTokTempAccounts: (tempToken: string) =>
        apiClient.get<TikTokTempAccountsResponse>(`/auth/tiktok/temp-accounts?tempToken=${tempToken}`),

    /**
     * Complete TikTok connection with selected advertiser account
     */
    completeTikTokConnection: (tempToken: string, advertiserId: string) =>
        apiClient.post<TikTokCompleteResponse>('/auth/tiktok/complete', {
            tempToken,
            advertiserId,
        }),

    /**
     * Disconnect all TikTok Ads accounts
     */
    disconnectTikTokAds: () =>
        apiClient.delete('/auth/tiktok/disconnect'),

    /**
     * Manually refresh TikTok access token
     */
    refreshTikTokToken: (accountId: string) =>
        apiClient.post('/auth/tiktok/refresh-token', { accountId }),
};
