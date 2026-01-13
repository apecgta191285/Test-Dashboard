import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

/**
 * Integration Callback State
 * 
 * Manages modal state for platform account selection after OAuth callback.
 */
interface IntegrationCallbackState {
    // Facebook
    showFbModal: boolean;
    fbTempToken: string;
    setShowFbModal: (show: boolean) => void;

    // TikTok
    showTikTokModal: boolean;
    tikTokTempToken: string;
    setShowTikTokModal: (show: boolean) => void;
}

/**
 * Hook to handle OAuth callbacks from various platforms
 * 
 * Listens for URL query parameters after OAuth redirect:
 * - status: 'success', 'select_account', or 'error'
 * - tempToken: temporary token for account selection
 * - platform: 'facebook', 'tiktok', 'google', etc.
 * - error: error message if failed
 */
export function useIntegrationCallback(): IntegrationCallbackState {
    const [, setLocation] = useLocation();

    // Facebook state
    const [showFbModal, setShowFbModal] = useState(false);
    const [fbTempToken, setFbTempToken] = useState('');

    // TikTok state
    const [showTikTokModal, setShowTikTokModal] = useState(false);
    const [tikTokTempToken, setTikTokTempToken] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const tempToken = params.get('tempToken');
        const platform = params.get('platform');
        const error = params.get('error');

        // Handle errors
        if (error) {
            toast.error(`Integration error: ${decodeURIComponent(error)}`);
            // Clean URL
            setLocation('/integrations', { replace: true });
            return;
        }

        // Handle Facebook callback
        if ((status === 'success' || status === 'select_account') && platform === 'facebook' && tempToken) {
            setFbTempToken(tempToken);
            setShowFbModal(true);
            // Clean URL but keep state
            window.history.replaceState({}, '', '/integrations');
            return;
        }

        // Handle TikTok callback
        if (status === 'select_account' && platform === 'tiktok' && tempToken) {
            setTikTokTempToken(tempToken);
            setShowTikTokModal(true);
            // Clean URL but keep state
            window.history.replaceState({}, '', '/integrations');
            return;
        }

        // Handle TikTok direct success (sandbox mode or single account auto-connect)
        if (status === 'success' && platform === 'tiktok') {
            toast.success('TikTok Ads connected successfully');
            // Clean URL and trigger refresh
            window.history.replaceState({}, '', '/integrations');
            // Note: The page component should handle refresh via useIntegrationStatus
            return;
        }

        // Handle Google Ads callback (already handled in GoogleAdsCard, but keeping for consistency)
        if (status === 'select_account' && platform === 'ads' && tempToken) {
            // Google Ads uses different modal pattern, handled in GoogleAdsCard
            window.history.replaceState({}, '', '/integrations');
            return;
        }

        // Handle LINE callback
        if (status === 'success' && platform === 'line') {
            toast.success('LINE Ads connected successfully');
            window.history.replaceState({}, '', '/integrations');
            return;
        }

    }, [setLocation]);

    return {
        // Facebook
        showFbModal,
        fbTempToken,
        setShowFbModal,

        // TikTok
        showTikTokModal,
        tikTokTempToken,
        setShowTikTokModal,
    };
}
