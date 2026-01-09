import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboardService } from '@/services/dashboard-service';
import { toast } from 'sonner';

// Helper function สำหรับ seed action (DRY)
const handleSeedAction = async (
    action: () => Promise<any>,
    loadingMsg: string,
    successMsg: string,
    errorMsg: string
) => {
    try {
        toast.promise(action(), {
            loading: loadingMsg,
            success: successMsg,
            error: errorMsg,
        });
    } catch (error) {
        console.error(error);
    }
};

// Helper function สำหรับ clear action with confirm (DRY)
const handleClearAction = async (
    action: () => Promise<any>,
    confirmMsg: string,
    loadingMsg: string,
    successMsg: string,
    errorMsg: string
) => {
    if (!confirm(confirmMsg)) return;
    handleSeedAction(action, loadingMsg, successMsg, errorMsg);
};

export default function Settings() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                            <p className="text-sm text-slate-500 mt-1">Manage your account and preferences.</p>
                        </div>
                    </div>
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Settings configuration coming soon.</p>
                        </CardContent>
                    </Card>

                    {/* Developer Zone */}
                    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-900">
                        <CardHeader>
                            <CardTitle className="text-orange-700 dark:text-orange-500 flex items-center gap-2">
                                <span>🛠️ Developer Zone</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Master Seed */}
                            <div className="p-4 border rounded-lg bg-background">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">🎯 Seed All Mock Data</h3>
                                        <p className="text-sm text-muted-foreground">
                                            สร้าง campaigns, metrics, alerts, sync logs ทั้งหมด
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="border-red-200 hover:bg-red-100 text-red-600"
                                            onClick={() => handleClearAction(
                                                dashboardService.clearMockData,
                                                'ลบ mock data ทั้งหมด?',
                                                'Clearing...', 'Cleared!', 'Failed'
                                            )}
                                        >
                                            Clear All
                                        </Button>
                                        <Button
                                            className="bg-orange-500 hover:bg-orange-600 text-white"
                                            onClick={() => handleSeedAction(
                                                dashboardService.seedMockData,
                                                'Seeding all...', 'Seeded!', 'Failed'
                                            )}
                                        >
                                            Seed All
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Category-specific Seeding */}
                            <div className="p-4 border rounded-lg bg-background">
                                <h3 className="font-medium mb-3">📦 Seed by Category</h3>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm"
                                        onClick={() => handleSeedAction(
                                            dashboardService.seedCampaigns,
                                            'Seeding campaigns...', '12 campaigns created!', 'Failed'
                                        )}
                                    >
                                        📢 Campaigns
                                    </Button>
                                    <Button variant="outline" size="sm"
                                        onClick={() => handleSeedAction(
                                            () => dashboardService.seedMetrics(30),
                                            'Seeding metrics...', 'Metrics created!', 'Failed'
                                        )}
                                    >
                                        📈 Metrics (30d)
                                    </Button>
                                    <Button variant="outline" size="sm"
                                        onClick={() => handleSeedAction(
                                            dashboardService.seedAlerts,
                                            'Seeding alerts...', '8 alerts created!', 'Failed'
                                        )}
                                    >
                                        🔔 Alerts
                                    </Button>
                                    <Button variant="outline" size="sm"
                                        onClick={() => handleSeedAction(
                                            dashboardService.seedSyncLogs,
                                            'Seeding sync logs...', '12 logs created!', 'Failed'
                                        )}
                                    >
                                        📋 Sync Logs
                                    </Button>
                                </div>
                            </div>

                            {/* Platform-specific Seeding */}
                            <div className="p-4 border rounded-lg bg-background">
                                <h3 className="font-medium mb-3">🌐 Seed by Platform</h3>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm"
                                        className="border-blue-200 hover:bg-blue-50 text-blue-600"
                                        onClick={() => handleSeedAction(
                                            () => dashboardService.seedPlatform('GOOGLE_ADS'),
                                            'Seeding Google Ads...', 'Google Ads seeded!', 'Failed'
                                        )}
                                    >
                                        🔵 Google Ads
                                    </Button>
                                    <Button variant="outline" size="sm"
                                        className="border-indigo-200 hover:bg-indigo-50 text-indigo-600"
                                        onClick={() => handleSeedAction(
                                            () => dashboardService.seedPlatform('FACEBOOK'),
                                            'Seeding Facebook...', 'Facebook seeded!', 'Failed'
                                        )}
                                    >
                                        🔵 Facebook
                                    </Button>
                                    <Button variant="outline" size="sm"
                                        className="border-gray-200 hover:bg-gray-50 text-gray-700"
                                        onClick={() => handleSeedAction(
                                            () => dashboardService.seedPlatform('TIKTOK'),
                                            'Seeding TikTok...', 'TikTok seeded!', 'Failed'
                                        )}
                                    >
                                        ⬛ TikTok
                                    </Button>
                                    <Button variant="outline" size="sm"
                                        className="border-green-200 hover:bg-green-50 text-green-600"
                                        onClick={() => handleSeedAction(
                                            () => dashboardService.seedPlatform('LINE_ADS'),
                                            'Seeding LINE Ads...', 'LINE Ads seeded!', 'Failed'
                                        )}
                                    >
                                        🟢 LINE Ads
                                    </Button>
                                </div>
                            </div>

                            {/* Warning */}
                            <p className="text-xs text-orange-600 font-medium text-center">
                                ⚠️ Warning: Use for testing only. Do not use on production data.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}

