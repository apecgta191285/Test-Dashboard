import { useState, useEffect, useMemo } from 'react';
import { useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PlatformConfig } from '@/constants/platforms';
import { apiClient } from '@/services/api-client';
import { toast } from 'sonner';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { DataSourceCard } from '../DataSourceCard';

interface LineAdsCardProps {
    platform: PlatformConfig;
}

export function LineAdsCard({ platform }: LineAdsCardProps) {
    const search = useSearch();
    const searchParams = useMemo(() => new URLSearchParams(search), [search]);

    const { status, lineAdsAccounts, isLoading, disconnectLineAds, refetch } = useIntegrationStatus();
    const [isConnecting, setIsConnecting] = useState(false);

    const isConnected = status.lineAds;

    // Handle OAuth callback parameters
    useEffect(() => {
        const statusParam = searchParams.get('status');
        const platformParam = searchParams.get('platform');

        if (statusParam === 'success' && platformParam === 'line') {
            toast.success('LINE Ads connected successfully!');
            refetch();
            // Clean URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        } else if (statusParam === 'error' && platformParam === 'line') {
            const message = searchParams.get('message') || 'Connection failed';
            toast.error(decodeURIComponent(message));
            // Clean URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams, refetch]);

    const handleConnect = async () => {
        try {
            setIsConnecting(true);
            const response = await apiClient.get<{ url: string }>('/auth/line/url');

            if (response.data && response.data.url) {
                window.location.href = response.data.url;
            } else {
                throw new Error('Failed to get auth URL');
            }
        } catch (error) {
            console.error('LINE Ads Connect Error:', error);
            toast.error('Failed to initiate LINE Ads connection');
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (confirm('Are you sure you want to disconnect LINE Ads? This will stop data syncing.')) {
            try {
                toast.promise(disconnectLineAds(), {
                    loading: 'Disconnecting...',
                    success: 'Disconnected successfully',
                    error: 'Failed to disconnect'
                });
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <DataSourceCard
            name={platform.name}
            description={platform.description}
            icon={platform.icon}
            color={platform.color}
            isConnected={isConnected}
            isConnecting={isConnecting || isLoading}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
        >
            {isConnected && lineAdsAccounts.length > 0 && (
                <div className="mt-4 space-y-3">
                    <div className="text-sm font-medium text-slate-700">Connected Accounts:</div>
                    <div className="space-y-2">
                        {lineAdsAccounts.map((account: any) => (
                            <div
                                key={account.id}
                                className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">
                                            {account.channelName || account.channelId}
                                        </span>
                                        <span className="text-xs text-slate-500">ID: {account.channelId}</span>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${account.status === 'ACTIVE'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {account.status}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="text-xs text-slate-500 text-right">
                        Last synced: {lineAdsAccounts[0]?.lastSyncAt
                            ? new Date(lineAdsAccounts[0].lastSyncAt).toLocaleString()
                            : 'Never'}
                    </div>
                </div>
            )}
        </DataSourceCard>
    );
}
