import { apiClient } from './api-client';

export const integrationService = {
    getGoogleAdsStatus: () => apiClient.get('/integrations/google-ads/status'),
    getGoogleAnalyticsStatus: () => apiClient.get('/auth/google/analytics/status'),
    getLineAdsStatus: () => apiClient.get('/integrations/line-ads/status'),
    getTikTokAdsStatus: () => apiClient.get('/integrations/tiktok-ads/status'),
    syncGoogleAds: () => apiClient.post('/integrations/google-ads/sync'),
    disconnectGoogleAds: () => apiClient.delete('/integrations/google-ads'),
    disconnectGoogleAnalytics: () => apiClient.delete('/integrations/google-analytics'),
    disconnectLineAds: () => apiClient.delete('/integrations/line-ads'),
    disconnectTikTokAds: () => apiClient.delete('/integrations/tiktok-ads'),
};

