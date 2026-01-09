import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PLATFORMS } from '@/constants/platforms';
import { GoogleAdsCard } from '@/components/integrations/google-ads/GoogleAdsCard';
import { GoogleAnalyticsCard } from '@/components/integrations/google-analytics/GoogleAnalyticsCard';
import { FacebookAdsCard } from '@/components/integrations/facebook/FacebookAdsCard';
import { DataSourceCard } from '@/components/integrations/DataSourceCard';
import { FacebookAccountSelectModal } from '@/components/integrations/facebook/FacebookAccountSelectModal';
import { TikTokAdsCard } from '@/components/integrations/tiktok/TikTokAdsCard';
import { LineAdsCard } from '@/components/integrations/line/LineAdsCard';
import { useIntegrationCallback } from '@/hooks/useIntegrationCallback';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';

export default function Integrations() {
  const { showFbModal, fbTempToken, setShowFbModal } = useIntegrationCallback();
  const {
    status,
    tiktokAdsAccounts,
    disconnectTikTokAds,
    refetch
  } = useIntegrationStatus();

  const handleFbSuccess = () => {
    // Refresh the page or trigger a re-fetch in the card
    // For simplicity, we can reload to ensure all cards update
    window.location.reload();
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Sources</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your platform connections and data integrations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORMS.map((platform) => {
              if (platform.id === 'google-ads') {
                return <GoogleAdsCard key={platform.id} platform={platform} />;
              }
              if (platform.id === 'google-analytics') {
                return <GoogleAnalyticsCard key={platform.id} platform={platform} />;
              }
              if (platform.id === 'facebook-ads') {
                return <FacebookAdsCard key={platform.id} platform={platform} />;
              }
              if (platform.id === 'tiktok-ads') {
                return (
                  <TikTokAdsCard
                    key={platform.id}
                    platform={platform}
                    isConnected={status.tiktokAds}
                    accounts={tiktokAdsAccounts}
                    onDisconnect={disconnectTikTokAds}
                    onRefresh={refetch}
                  />
                );
              }
              if (platform.id === 'line-ads') {
                return <LineAdsCard key={platform.id} platform={platform} />;
              }

              // Placeholder for other platforms
              return (
                <DataSourceCard
                  key={platform.id}
                  name={platform.name}
                  description={platform.description}
                  icon={platform.icon}
                  color={platform.color}
                  isConnected={false}
                  onConnect={() => { }}
                >
                  <div className="w-full bg-slate-50 py-2 text-center text-xs text-slate-400 rounded border border-slate-100 border-dashed">
                    Coming Soon
                  </div>
                </DataSourceCard>
              );
            })}
          </div>
        </div>

        <FacebookAccountSelectModal
          open={showFbModal}
          onOpenChange={setShowFbModal}
          tempToken={fbTempToken}
          onSuccess={handleFbSuccess}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
