import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GettingStartedWidget } from '@/components/dashboard/GettingStartedWidget';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { DashboardKPIs } from '@/features/dashboard/components/DashboardKPIs';
import { TrendsChart } from '@/features/dashboard/components/TrendsChart';
import { TopCampaignsTable } from '@/features/dashboard/components/TopCampaignsTable';
import { DeviceBreakdownWidget } from '@/components/dashboard/DeviceBreakdownWidget';
import { ActiveChannelsWidget } from '@/components/dashboard/ActiveChannelsWidget';
import { AlertWidget } from '@/components/dashboard/AlertWidget';
import { DateRangeProvider } from '@/contexts/DateRangeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PlatformTabs } from '@/components/dashboard/PlatformTabs';

function DashboardContent() {
    const {
        overview,
        topCampaigns,
        trendsData: trends,
        selectedPlatform,
        setSelectedPlatform,
        isLoading,
        isTrendsLoading,
        error,
        exportCSV: handleExportCSV,
        exportPDF: handleExportPDF,
    } = useDashboard();

    if (isLoading && !overview) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const isMockData = (overview as any)?.isMockData;

    return (
        <div className={`space-y-6 transition-opacity duration-200 ${isLoading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            <DashboardHeader
                onExportCSV={handleExportCSV}
                onExportPDF={handleExportPDF}
            />

            <PlatformTabs
                selectedPlatform={selectedPlatform}
                onPlatformChange={setSelectedPlatform}
            />

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {isMockData && (
                <Alert className="bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🧪</span>
                        <AlertDescription>
                            <strong>Demo Mode Active:</strong> You are viewing generated mock data. Connect a real ad account with traffic to see actual performance.
                        </AlertDescription>
                    </div>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <DashboardKPIs overview={overview} />
                    <TrendsChart data={trends} isLoading={isTrendsLoading} />
                    <TopCampaignsTable campaigns={topCampaigns} />
                </div>

                <div className="space-y-6">
                    <AlertWidget />
                    <GettingStartedWidget />
                    <ActiveChannelsWidget />
                    <DeviceBreakdownWidget />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    return (
        <ProtectedRoute>
            <DateRangeProvider>
                <DashboardLayout>
                    <DashboardContent />
                </DashboardLayout>
            </DateRangeProvider>
        </ProtectedRoute>
    );
}