import { useMemo } from 'react';
import { useSearch } from 'wouter';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { PLATFORMS } from '../constants/platforms';
import { useIntegrationStatus, IntegrationStatus } from '../hooks/useIntegrationStatus';
import { GoogleAdsCard } from './integrations/google-ads/GoogleAdsCard';
import { GoogleAnalyticsCard } from './integrations/google-analytics/GoogleAnalyticsCard';

const statusKeyMap: Record<string, keyof IntegrationStatus> = {
    'google-ads': 'googleAds',
    'facebook-ads': 'facebookAds',
    'line-ads': 'lineAds',
    'tiktok-ads': 'tiktokAds',
};

export function IntegrationChecklist() {
    const { status, isLoading } = useIntegrationStatus();

    if (isLoading) {
        return (
            <Card>
                <CardContent className="pt-6 flex justify-center">
                    <LoadingSpinner text="Loading integration status..." />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Platform Integrations</CardTitle>
                <CardDescription>
                    Connect your ad platforms to start tracking performance.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                {PLATFORMS.map((platform) => {
                    if (platform.id === 'google-ads') {
                        return <GoogleAdsCard key={platform.id} platform={platform} />;
                    }
                    if (platform.id === 'google-analytics') {
                        return <GoogleAnalyticsCard key={platform.id} platform={platform} />;
                    }

                    const statusKey = statusKeyMap[platform.id];
                    const isConnected = statusKey ? status[statusKey] : false;

                    return (
                        <div
                            key={platform.id}
                            className="flex items-start justify-between space-x-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm"
                        >
                            <div className="flex items-start space-x-4">
                                <div className={`p-2 rounded-full bg-muted ${platform.color}`}>
                                    <platform.icon className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        {platform.name}
                                        {isConnected && (
                                            <span className="text-xs font-normal text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Connected
                                            </span>
                                        )}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {platform.description}
                                    </p>
                                </div>
                            </div>

                            <Button variant="ghost" size="sm" disabled className="shrink-0">
                                Coming Soon
                            </Button>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
