import { useState, useEffect, useCallback } from 'react';
import { integrationService } from '@/services/integration-service';

export interface IntegrationStatus {
    googleAds: boolean;
    facebookAds: boolean;
    lineAds: boolean;
    tiktokAds: boolean;
    googleAnalytics: boolean;
}

export function useIntegrationStatus() {
    const [status, setStatus] = useState<IntegrationStatus>({
        googleAds: false,
        facebookAds: false,
        lineAds: false,
        tiktokAds: false,
        googleAnalytics: false,
    });
    const [accounts, setAccounts] = useState<any[]>([]);
    const [ga4Account, setGa4Account] = useState<any>(null);
    const [lineAdsAccounts, setLineAdsAccounts] = useState<any[]>([]);
    const [tiktokAdsAccounts, setTiktokAdsAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            setIsLoading(true);

            // Fetch all statuses in parallel
            const [googleAdsRes, ga4Res, lineAdsRes, tiktokAdsRes] = await Promise.allSettled([
                integrationService.getGoogleAdsStatus(),
                integrationService.getGoogleAnalyticsStatus(),
                integrationService.getLineAdsStatus(),
                integrationService.getTikTokAdsStatus(),
            ]);

            const googleAdsStatus = googleAdsRes.status === 'fulfilled' ? googleAdsRes.value.data : { isConnected: false, accounts: [] };
            const ga4Status = ga4Res.status === 'fulfilled' ? ga4Res.value.data : { isConnected: false, account: null };
            const lineAdsStatus = lineAdsRes.status === 'fulfilled' ? lineAdsRes.value.data : { isConnected: false, accounts: [] };
            const tiktokAdsStatus = tiktokAdsRes.status === 'fulfilled' ? tiktokAdsRes.value.data : { isConnected: false, accounts: [] };

            setStatus(prev => ({
                ...prev,
                googleAds: googleAdsStatus.isConnected,
                googleAnalytics: ga4Status.isConnected,
                lineAds: lineAdsStatus.isConnected,
                tiktokAds: tiktokAdsStatus.isConnected,
            }));

            setAccounts(googleAdsStatus.accounts || []);
            setGa4Account(ga4Status.account || null);
            setLineAdsAccounts(lineAdsStatus.accounts || []);
            setTiktokAdsAccounts(tiktokAdsStatus.accounts || []);
        } catch (error) {
            console.error('Failed to fetch integration status:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const syncGoogleAds = async () => {
        try {
            setIsSyncing(true);
            await integrationService.syncGoogleAds();
            await fetchStatus(); // Refresh status to get new lastSyncAt
            return true;
        } catch (error) {
            throw error;
        } finally {
            setIsSyncing(false);
        }
    };

    const disconnectGoogleAnalytics = async () => {
        try {
            setIsLoading(true);
            await integrationService.disconnectGoogleAnalytics();
            await fetchStatus();
            return true;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const disconnectGoogleAds = async () => {
        try {
            setIsLoading(true);
            await integrationService.disconnectGoogleAds();
            await fetchStatus();
            return true;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const disconnectLineAds = async () => {
        try {
            setIsLoading(true);
            await integrationService.disconnectLineAds();
            await fetchStatus();
            return true;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const disconnectTikTokAds = async () => {
        try {
            setIsLoading(true);
            await integrationService.disconnectTikTokAds();
            await fetchStatus();
            return true;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    return {
        status,
        accounts,
        ga4Account,
        lineAdsAccounts,
        tiktokAdsAccounts,
        isLoading,
        isSyncing,
        refetch: fetchStatus,
        syncGoogleAds,
        disconnectGoogleAds,
        disconnectGoogleAnalytics,
        disconnectLineAds,
        disconnectTikTokAds,
    };
}
