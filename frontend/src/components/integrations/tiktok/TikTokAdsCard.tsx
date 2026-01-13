import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, FlaskConical, RefreshCw } from 'lucide-react';
import { PlatformConfig } from '@/constants/platforms';
import { integrationService } from '@/services/integration-service';
import { toast } from 'sonner';

interface TikTokAdsCardProps {
    platform: PlatformConfig;
    isConnected: boolean;
    accounts: any[];
    onDisconnect: () => Promise<boolean>;
    onRefresh: () => void;
}

/**
 * TikTok Ads Integration Card
 * 
 * Displays TikTok Ads connection status and provides:
 * - Connect button (redirects to TikTok OAuth or uses sandbox)
 * - Account list display
 * - Disconnect functionality
 * 
 * Note: Account selection modal is handled by Integrations.tsx after OAuth callback
 */
export function TikTokAdsCard({
    platform,
    isConnected,
    accounts,
    onDisconnect,
    onRefresh
}: TikTokAdsCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    /**
     * Handle connect button click
     * 
     * Flow:
     * 1. Call /auth/tiktok/url to check mode
     * 2. If sandbox mode -> call connect-sandbox directly
     * 3. If production mode -> redirect to TikTok OAuth
     * 4. After OAuth callback, Integrations.tsx will show TikTokAccountSelectModal
     */
    const handleConnect = async () => {
        try {
            setIsLoading(true);

            // 1. Get auth URL or sandbox info
            const response = await integrationService.getTikTokAuthUrl();
            const data = response.data;

            if (data.isSandbox) {
                // Sandbox mode - connect directly with pre-configured credentials
                try {
                    const sandboxResponse = await integrationService.connectTikTokSandbox();

                    if (sandboxResponse.data?.success) {
                        toast.success('TikTok Sandbox connected successfully');
                        onRefresh();
                    } else {
                        throw new Error('Failed to connect sandbox account');
                    }
                } catch (sandboxError: any) {
                    console.error('TikTok Sandbox Error:', sandboxError);
                    toast.error(
                        sandboxError.response?.data?.message ||
                        'Failed to connect sandbox account. Check TIKTOK_SANDBOX_ACCESS_TOKEN and TIKTOK_SANDBOX_ADVERTISER_ID.'
                    );
                }
            } else if (data.url) {
                // Production mode - redirect to TikTok OAuth
                // User will be redirected back to /integrations?status=select_account&tempToken=xxx&platform=tiktok
                window.location.href = data.url;
            } else {
                throw new Error('No auth URL received from server');
            }
        } catch (error: any) {
            console.error('TikTok Connect Error:', error);
            toast.error(
                error.response?.data?.message ||
                'Failed to initiate TikTok connection'
            );
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle disconnect button click
     */
    const handleDisconnect = async () => {
        try {
            setIsDisconnecting(true);
            await onDisconnect();
            toast.success('TikTok Ads disconnected successfully');
            onRefresh();
        } catch (error: any) {
            console.error('TikTok Disconnect Error:', error);
            toast.error(
                error.response?.data?.message ||
                'Failed to disconnect TikTok Ads'
            );
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Check if any account is a sandbox account
    const hasSandboxAccount = accounts.some(
        acc => acc.accountName?.toLowerCase().includes('sandbox')
    );

    // Format last sync time
    const getLastSyncText = (account: any) => {
        if (!account.lastSyncAt) return 'Never synced';
        const date = new Date(account.lastSyncAt);
        return `Synced ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    return (
        <Card className="relative overflow-hidden transition-all hover:shadow-md border-slate-200">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg bg-slate-900 ${platform.color}`}>
                        <platform.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex gap-1">
                        {hasSandboxAccount && (
                            <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                <FlaskConical className="w-3 h-3 mr-1" />
                                Sandbox
                            </Badge>
                        )}
                        {isConnected && (
                            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Connected
                            </Badge>
                        )}
                    </div>
                </div>
                <CardTitle className="mt-4 text-lg font-semibold text-slate-900">
                    {platform.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-1">
                    {platform.description}
                </CardDescription>
            </CardHeader>

            <CardContent>
                {isConnected ? (
                    <div className="space-y-3">
                        {/* Connected Accounts List */}
                        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-slate-700">Accounts</span>
                                <span className="text-green-600 flex items-center text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                                    {accounts.length} connected
                                </span>
                            </div>

                            {accounts.length > 0 && (
                                <div className="space-y-2 mt-3">
                                    {accounts.map((acc, i) => (
                                        <div
                                            key={acc.id || i}
                                            className="flex items-center justify-between text-xs border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700 truncate max-w-[150px]">
                                                    {acc.accountName || acc.advertiserId}
                                                </span>
                                                <span className="text-slate-400 font-mono text-[10px]">
                                                    {acc.advertiserId}
                                                </span>
                                            </div>
                                            <span className="text-slate-400 text-[10px]">
                                                {acc.status === 'ACTIVE' && (
                                                    <span className="text-green-600">Active</span>
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={onRefresh}
                                disabled={isDisconnecting}
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Refresh
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                            >
                                {isDisconnecting ? (
                                    <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Disconnecting...
                                    </>
                                ) : (
                                    'Disconnect'
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Connect Button */
                    <Button
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                        onClick={handleConnect}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            'Connect TikTok Ads'
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
