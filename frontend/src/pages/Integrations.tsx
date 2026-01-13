import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PLATFORMS } from '@/constants/platforms';
import { GoogleAdsCard } from '@/components/integrations/google-ads/GoogleAdsCard';
import { GoogleAnalyticsCard } from '@/components/integrations/google-analytics/GoogleAnalyticsCard';
import { FacebookAdsCard } from '@/components/integrations/facebook/FacebookAdsCard';
import { DataSourceCard } from '@/components/integrations/DataSourceCard';
import { FacebookAccountSelectModal } from '@/components/integrations/facebook/FacebookAccountSelectModal';
import { TikTokAdsCard } from '@/components/integrations/tiktok/TikTokAdsCard';
import { TikTokAccountSelectModal } from '@/components/integrations/tiktok/TikTokAccountSelectModal';
import { LineAdsCard } from '@/components/integrations/line/LineAdsCard';
import { useIntegrationCallback } from '@/hooks/useIntegrationCallback';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';

/**
 * Integrations Page (Data Sources)
 * 
 * Manages all platform connections and OAuth flows.
 * 
 * Account Selection Flow (for TikTok, Facebook):
 * 1. User clicks "Connect" in platform card
 * 2. Card component redirects to OAuth provider
 * 3. After OAuth, user is redirected back with ?status=select_account&tempToken=xxx&platform=xxx
 * 4. useIntegrationCallback hook detects this and opens the appropriate modal
 * 5. User selects account in modal
 * 6. Modal calls complete endpoint and triggers refresh
 */
export default function Integrations() {
  // Handle OAuth callbacks (shows modal when redirected back)
  const {
    showFbModal,
    fbTempToken,
    setShowFbModal,
    showTikTokModal,
    tikTokTempToken,
    setShowTikTokModal,
  } = useIntegrationCallback();

  // Fetch and manage integration statuses
  const {
    status,
    tiktokAdsAccounts,
    disconnectTikTokAds,
    refetch
  } = useIntegrationStatus();

  /**
   * Handle successful Facebook account connection
   */
  const handleFbSuccess = () => {
    refetch();
  };

  /**
   * Handle successful TikTok account connection
   */
  const handleTikTokSuccess = () => {
    refetch();
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Data Sources
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your platform connections and data integrations
            </p>
          </div>

          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORMS.map((platform) => {
              // Google Ads
              if (platform.id === 'google-ads') {
                return <GoogleAdsCard key={platform.id} platform={platform} />;
              }

              // Google Analytics
              if (platform.id === 'google-analytics') {
                return <GoogleAnalyticsCard key={platform.id} platform={platform} />;
              }

              // Facebook Ads
              if (platform.id === 'facebook-ads') {
                return <FacebookAdsCard key={platform.id} platform={platform} />;
              }

              // TikTok Ads
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

              // LINE Ads
              if (platform.id === 'line-ads') {
                return <LineAdsCard key={platform.id} platform={platform} />;
              }

              // Placeholder for other platforms (Coming Soon)
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

        {/* Facebook Account Selection Modal */}
        <FacebookAccountSelectModal
          open={showFbModal}
          onOpenChange={setShowFbModal}
          tempToken={fbTempToken}
          onSuccess={handleFbSuccess}
        />

        {/* TikTok Account Selection Modal */}
        <TikTokAccountSelectModal
          open={showTikTokModal}
          onOpenChange={setShowTikTokModal}
          tempToken={tikTokTempToken}
          onSuccess={handleTikTokSuccess}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
