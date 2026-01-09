import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, FlaskConical } from 'lucide-react';
import { PlatformConfig } from '@/constants/platforms';
import { apiClient } from '@/services/api-client';
import { toast } from 'sonner';

interface TikTokAdsCardProps {
    platform: PlatformConfig;
    isConnected: boolean;
    accounts: any[];
    onDisconnect: () => Promise<boolean>;
    onRefresh: () => void;
}

interface AuthUrlResponse {
    isSandbox?: boolean;
    url?: string;
    connectEndpoint?: string;
    message?: string;
}

export function TikTokAdsCard({ platform, isConnected, accounts, onDisconnect, onRefresh }: TikTokAdsCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const handleConnect = async () => {
        try {
            setIsLoading(true);

            // 1. Check mode and get auth URL
            const response = await apiClient.get<AuthUrlResponse>('/auth/tiktok/url');

            if (response.data.isSandbox) {
                // Sandbox mode - use direct connection
                const sandboxResponse = await apiClient.post('/auth/tiktok/connect-sandbox');
                if (sandboxResponse.data?.success) {
                    toast.success('TikTok Sandbox connected successfully');
                    onRefresh();
                } else {
                    throw new Error('Failed to connect sandbox account');
                }
            } else if (response.data.url) {
                // Production mode - redirect to TikTok OAuth
                window.location.href = response.data.url;
            } else {
                throw new Error('Failed to get auth URL');
            }
        } catch (error: any) {
            console.error('TikTok Connect Error:', error);
            toast.error(error.response?.data?.message || 'Failed to initiate TikTok connection');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setIsDisconnecting(true);
            await onDisconnect();
            toast.success('TikTok Ads disconnected successfully');
            onRefresh();
        } catch (error) {
            console.error('TikTok Disconnect Error:', error);
            toast.error('Failed to disconnect TikTok Ads');
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Check if any account is a sandbox account
    const hasSandboxAccount = accounts.some(acc => acc.accountName?.includes('Sandbox'));

    return (
        <Card className="relative overflow-hidden transition-all hover:shadow-md border-slate-200">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg bg-slate-100 ${platform.color}`}>
                        <platform.icon className="w-6 h-6" />
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
                        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-slate-700">Accounts</span>
                                <span className="text-green-600 flex items-center text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                                    {accounts.length} connected
                                </span>
                            </div>
                            {accounts.length > 0 && (
                                <div className="text-xs text-slate-400 mt-2">
                                    {accounts.map((acc, i) => (
                                        <div key={acc.id || i} className="truncate">
                                            {acc.accountName || acc.advertiserId}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                        >
                            {isDisconnecting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Disconnecting...
                                </>
                            ) : (
                                'Disconnect'
                            )}
                        </Button>
                    </div>
                ) : (
                    <Button
                        className="w-full bg-black hover:bg-slate-800 text-white"
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
