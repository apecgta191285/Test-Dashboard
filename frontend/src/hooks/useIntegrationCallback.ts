import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

interface IntegrationCallbackState {
    showFbModal: boolean;
    fbTempToken: string;
    setShowFbModal: (show: boolean) => void;
}

export function useIntegrationCallback(): IntegrationCallbackState {
    const [location, setLocation] = useLocation();
    const [showFbModal, setShowFbModal] = useState(false);
    const [fbTempToken, setFbTempToken] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const tempToken = params.get('tempToken');
        const platform = params.get('platform');
        const error = params.get('error');

        if (error) {
            toast.error(`Integration error: ${decodeURIComponent(error)}`);
            // Clean URL
            setLocation('/integrations', { replace: true });
            return;
        }

        if (status === 'success' && platform === 'facebook' && tempToken) {
            setFbTempToken(tempToken);
            setShowFbModal(true);
            // Clean URL but keep state
            window.history.replaceState({}, '', '/integrations');
        }
    }, [setLocation]);

    return {
        showFbModal,
        fbTempToken,
        setShowFbModal,
    };
}
