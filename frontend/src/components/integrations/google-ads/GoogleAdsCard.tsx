import { Button } from '../../ui/button';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { toast } from 'sonner';
import { useIntegrationStatus } from '../../../hooks/useIntegrationStatus';
import { useOAuthFlow } from '../../../hooks/useOAuthFlow';
import { AccountSelectionDialog } from './AccountSelectionDialog';
import { useEffect, useMemo } from 'react';
import { useSearch } from 'wouter';
import { DataSourceCard } from '../DataSourceCard';

interface GoogleAdsCardProps {
    platform: {
        id: string;
        name: string;
        icon: any;
        color: string;
        description: string;
    };
}

export function GoogleAdsCard({ platform }: GoogleAdsCardProps) {
    const search = useSearch();
    const searchParams = useMemo(() => new URLSearchParams(search), [search]);

    const { status, accounts, isSyncing, syncGoogleAds, disconnectGoogleAds, refetch } = useIntegrationStatus();

    // Wire up OAuth flow with auto-refetch on success
    const {
        isConnecting,
        startGoogleAdsFlow,
        tempAccounts,
        fetchTempAccounts,
        completeConnection,
        cancelFlow
    } = useOAuthFlow({
        onSuccess: () => {
            refetch();
        }
    });

    // Handle OAuth callback parameters
    useEffect(() => {
        const statusParam = searchParams.get('status');
        const tempTokenParam = searchParams.get('tempToken');
        const errorParam = searchParams.get('error');

        if (errorParam) {
            const errorMessage = decodeURIComponent(errorParam);
            console.error('OAuth Error:', errorMessage);
            toast.error(`Connection failed: ${errorMessage}`);

            // Clean URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

        } else if (statusParam === 'select_account' && tempTokenParam) {
            fetchTempAccounts(tempTokenParam);
        }
    }, [searchParams, fetchTempAccounts]);

    const isConnected = status.googleAds;

    const handleSync = async () => {
        try {
            toast.promise(syncGoogleAds(), {
                loading: 'Syncing campaigns...',
                success: 'Sync completed successfully',
                error: 'Failed to sync campaigns'
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDisconnect = async () => {
        if (confirm('Are you sure you want to disconnect Google Ads? This will stop data syncing.')) {
            try {
                toast.promise(disconnectGoogleAds(), {
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
        <>
            <DataSourceCard
                name={platform.name}
                description={platform.description}
                icon={platform.icon}
                color={platform.color}
                isConnected={isConnected}
                isConnecting={isConnecting}
                isSyncing={isSyncing}
                onConnect={startGoogleAdsFlow}
                onDisconnect={handleDisconnect}
            >
                {isConnected && (
                    <>
                        {accounts.length > 0 && (
                            <div className="mt-4 space-y-3">
                                <div className="text-sm font-medium text-slate-700">Connected Accounts:</div>
                                <div className="space-y-2">
                                    {accounts.map((account) => (
                                        <div
                                            key={account.id}
                                            className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-900">
                                                        {account.accountName || account.customerId}
                                                    </span>
                                                    <span className="text-xs text-slate-500">ID: {account.customerId}</span>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${account.status === 'ENABLED'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {account.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-slate-500 text-right">
                                    Last synced: {accounts[0]?.lastSyncAt
                                        ? new Date(accounts[0].lastSyncAt).toLocaleString()
                                        : 'Never'}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 mt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => window.location.href = '/dashboard'}
                            >
                                View Dashboard
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleSync}
                                disabled={isSyncing}
                            >
                                {isSyncing ? (
                                    <LoadingSpinner size="sm" className="mr-2" />
                                ) : (
                                    'Sync Now'
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </DataSourceCard>

            <AccountSelectionDialog
                isOpen={tempAccounts.length > 0 || (isConnecting && !isConnected)}
                isLoading={isConnecting && tempAccounts.length === 0}
                accounts={tempAccounts}
                onSelect={completeConnection}
                onCancel={cancelFlow}
            />
        </>
    );
}
