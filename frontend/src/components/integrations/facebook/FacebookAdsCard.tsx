import { useState, useEffect } from 'react';
import { PlatformConfig } from '@/constants/platforms';
import { DataSourceCard } from '../DataSourceCard';
import { apiClient } from '@/services/api-client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
    platform: PlatformConfig;
}

interface FacebookAccount {
    id: string;
    accountId: string;
    accountName: string;
    status: string;
    lastSyncAt: string;
}

export function FacebookAdsCard({ platform }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [accounts, setAccounts] = useState<FacebookAccount[]>([]);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            const response = await apiClient.get('/auth/facebook/ads/accounts');
            if (response.data && response.data.length > 0) {
                setIsConnected(true);
                setAccounts(response.data);
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Failed to check Facebook connection:', error);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const response = await apiClient.get(platform.connectUrl!);
            if (response.data.authUrl) {
                window.location.href = response.data.authUrl;
            }
        } catch (error) {
            toast.error('Failed to initiate connection');
        }
    };

    const handleDisconnect = async () => {
        // TODO: Implement disconnect endpoint
        toast.info('Disconnect functionality coming soon');
    };

    return (
        <DataSourceCard
            name={platform.name}
            description={platform.description}
            icon={platform.icon}
            color={platform.color}
            isConnected={isConnected}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            isConnecting={isLoading}
        >
            {isConnected && accounts.length > 0 && (
                <div className="mt-4 space-y-3">
                    <div className="text-sm font-medium text-slate-700">Connected Accounts:</div>
                    <div className="space-y-2">
                        {accounts.map((account) => (
                            <div
                                key={account.id}
                                className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100"
                            >
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">
                                            {account.accountName || account.accountId}
                                        </span>
                                        <span className="text-xs text-slate-500">ID: {account.accountId}</span>
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
                </div>
            )}
        </DataSourceCard>
    );
}
