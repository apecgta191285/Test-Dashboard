import { useState, useCallback } from 'react';
import { apiClient as api } from '@/services/api-client';
import { showApiError } from '../lib/errorHandler';
import { toast } from 'sonner';

interface UseOAuthFlowProps {
    onSuccess?: () => void;
}

export function useOAuthFlow({ onSuccess }: UseOAuthFlowProps = {}) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [tempAccounts, setTempAccounts] = useState<any[]>([]);
    const [tempToken, setTempToken] = useState<string | null>(null);

    const startGoogleAdsFlow = useCallback(async () => {
        try {
            setIsConnecting(true);
            const response = await api.get('/integrations/google-ads/auth-url');
            if (response.data && response.data.url) {
                window.location.href = response.data.url;
            } else {
                toast.error('Failed to get authentication URL');
            }
        } catch (error) {
            showApiError(error, 'Failed to start Google Ads connection');
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const cancelFlow = useCallback(() => {
        setTempAccounts([]);
        setTempToken(null);
        setIsConnecting(false);
        // Clean URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
    }, []);

    const fetchTempAccounts = useCallback(async (token: string) => {
        try {
            setIsConnecting(true);
            const response = await api.get(`/auth/google/ads/temp-accounts?tempToken=${token}`);
            setTempAccounts(response.data);
            setTempToken(token);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to fetch Google Ads accounts';
            if (message.includes('expired') || message.includes('invalid token')) {
                toast.error('Session expired. Please try connecting again.');
                cancelFlow();
            } else {
                showApiError(error, 'Failed to fetch Google Ads accounts');
            }
        } finally {
            setIsConnecting(false);
        }
    }, [cancelFlow]);

    const completeConnection = useCallback(async (customerId: string) => {
        if (!tempToken) return;
        try {
            setIsConnecting(true);
            await api.post('/auth/google/ads/complete', {
                tempToken,
                customerId,
            });

            // ✅ Sync Progress Toast
            toast.info('Connection successful! Starting background sync...', {
                duration: 5000,
                description: 'Your campaigns are being imported. This may take a few minutes.'
            });

            setTempAccounts([]);
            setTempToken(null);

            // ✅ Clean URL parameters
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            showApiError(error, 'Failed to complete Google Ads connection');
        } finally {
            setIsConnecting(false);
        }
    }, [tempToken, onSuccess]);

    return {
        isConnecting,
        startGoogleAdsFlow,
        tempAccounts,
        fetchTempAccounts,
        completeConnection,
        cancelFlow,
    };
}
