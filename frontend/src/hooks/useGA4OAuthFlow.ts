import { useState, useCallback } from 'react';
import { apiClient as api } from '@/services/api-client';
import { showApiError } from '../lib/errorHandler';
import { toast } from 'sonner';

interface UseGA4OAuthFlowProps {
    onSuccess?: () => void;
}

export function useGA4OAuthFlow({ onSuccess }: UseGA4OAuthFlowProps = {}) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [tempProperties, setTempProperties] = useState<any[]>([]);
    const [tempToken, setTempToken] = useState<string | null>(null);

    const startGA4Flow = useCallback(async () => {
        try {
            setIsConnecting(true);
            const response = await api.get('/auth/google/analytics/url');
            if (response.data && response.data.authUrl) {
                window.location.href = response.data.authUrl;
            } else {
                toast.error('Failed to get authorization URL');
            }
        } catch (error) {
            showApiError(error, 'Failed to start Google Analytics connection');
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const cancelFlow = useCallback(() => {
        setTempProperties([]);
        setTempToken(null);
        setIsConnecting(false);
        // Clean URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
    }, []);

    const fetchTempProperties = useCallback(async (token: string) => {
        try {
            setIsConnecting(true);
            const response = await api.get(`/auth/google/analytics/temp-properties?tempToken=${token}`);
            setTempProperties(response.data);
            setTempToken(token);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to fetch GA4 properties';
            if (message.includes('expired') || message.includes('invalid token')) {
                toast.error('Session expired. Please try connecting again.');
                cancelFlow();
            } else {
                showApiError(error, 'Failed to fetch GA4 properties');
            }
        } finally {
            setIsConnecting(false);
        }
    }, [cancelFlow]);

    const completeConnection = useCallback(async (propertyId: string) => {
        if (!tempToken) return;
        try {
            setIsConnecting(true);
            await api.post('/auth/google/analytics/complete', {
                tempToken,
                propertyId,
            });

            // ✅ Sync Progress Toast
            toast.info('Connection successful! Starting background sync...', {
                duration: 5000,
                description: 'Your analytics data is being imported. This may take a few minutes.'
            });

            setTempProperties([]);
            setTempToken(null);

            // ✅ Clean URL parameters
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            showApiError(error, 'Failed to complete Google Analytics connection');
        } finally {
            setIsConnecting(false);
        }
    }, [tempToken, onSuccess]);

    return {
        isConnecting,
        startGA4Flow,
        tempProperties,
        fetchTempProperties,
        completeConnection,
        cancelFlow,
    };
}
