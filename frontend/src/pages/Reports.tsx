import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { dashboardService } from '@/services/dashboard-service';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

type ExportPeriod = '7d' | '14d' | '30d' | '90d';
type PlatformFilter = 'ALL' | 'GOOGLE_ADS' | 'FACEBOOK' | 'TIKTOK' | 'LINE_ADS';
type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'DRAFT';

export default function Reports() {
    // Filter states
    const [period, setPeriod] = useState<ExportPeriod>('7d');
    const [platform, setPlatform] = useState<PlatformFilter>('ALL');
    const [status, setStatus] = useState<StatusFilter>('ALL');

    // Loading states
    const [isExportingCSV, setIsExportingCSV] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    /**
     * Export campaigns to CSV
     * Endpoint: GET /dashboard/export/campaigns/csv
     */
    const handleExportCSV = async () => {
        setIsExportingCSV(true);
        try {
            const response = await dashboardService.exportCampaignsCSV(
                platform === 'ALL' ? undefined : platform,
                status === 'ALL' ? undefined : status
            );

            // Create blob and trigger download
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `campaigns-${platform.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('CSV exported successfully', {
                description: `Downloaded campaigns report with ${platform === 'ALL' ? 'all platforms' : platform} filter.`
            });
        } catch (error) {
            console.error('Export CSV error:', error);
            toast.error('Failed to export CSV', {
                description: 'Please check your connection and try again.'
            });
        } finally {
            setIsExportingCSV(false);
        }
    };

    /**
     * Export metrics to PDF
     * Endpoint: GET /dashboard/export/metrics/pdf
     */
    const handleExportPDF = async () => {
        setIsExportingPDF(true);
        try {
            // PDF endpoint only supports 7d or 30d
            const pdfPeriod = period === '7d' || period === '14d' ? '7d' : '30d';
            const response = await dashboardService.exportMetricsPDF(pdfPeriod);

            // Create blob and trigger download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `metrics-report-${pdfPeriod}-${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('PDF report exported successfully', {
                description: `Downloaded ${pdfPeriod === '7d' ? 'Last 7 Days' : 'Last 30 Days'} metrics report.`
            });
        } catch (error) {
            console.error('Export PDF error:', error);
            toast.error('Failed to export PDF', {
                description: 'Please check your connection and try again.'
            });
        } finally {
            setIsExportingPDF(false);
        }
    };

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Export</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Download campaign data and performance metrics
                        </p>
                    </div>

                    {/* Filters Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Export Filters</CardTitle>
                            <CardDescription>Configure filters before exporting</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Period Filter */}
                                <div className="space-y-2">
                                    <Label htmlFor="period">Time Period</Label>
                                    <Select value={period} onValueChange={(v) => setPeriod(v as ExportPeriod)}>
                                        <SelectTrigger id="period">
                                            <SelectValue placeholder="Select period" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7d">Last 7 Days</SelectItem>
                                            <SelectItem value="14d">Last 14 Days</SelectItem>
                                            <SelectItem value="30d">Last 30 Days</SelectItem>
                                            <SelectItem value="90d">Last 90 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Platform Filter */}
                                <div className="space-y-2">
                                    <Label htmlFor="platform">Platform</Label>
                                    <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformFilter)}>
                                        <SelectTrigger id="platform">
                                            <SelectValue placeholder="Select platform" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Platforms</SelectItem>
                                            <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
                                            <SelectItem value="FACEBOOK">Facebook Ads</SelectItem>
                                            <SelectItem value="TIKTOK">TikTok Ads</SelectItem>
                                            <SelectItem value="LINE_ADS">LINE Ads</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Status Filter */}
                                <div className="space-y-2">
                                    <Label htmlFor="status">Campaign Status</Label>
                                    <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                                        <SelectTrigger id="status">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Statuses</SelectItem>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="PAUSED">Paused</SelectItem>
                                            <SelectItem value="ENDED">Ended</SelectItem>
                                            <SelectItem value="DRAFT">Draft</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Export Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* CSV Export Card */}
                        <Card className="border-slate-200 hover:border-slate-300 transition-colors">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Campaign Data (CSV)</CardTitle>
                                        <CardDescription>Export all campaigns with metrics</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-sm text-slate-600">
                                        <p>Includes:</p>
                                        <ul className="list-disc list-inside mt-1 text-slate-500">
                                            <li>Campaign name, platform, status</li>
                                            <li>Impressions, clicks, spend</li>
                                            <li>Conversions, revenue, ROAS</li>
                                            <li>CTR, CPC metrics</li>
                                        </ul>
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handleExportCSV}
                                        disabled={isExportingCSV}
                                    >
                                        {isExportingCSV ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Exporting...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download CSV
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* PDF Export Card */}
                        <Card className="border-slate-200 hover:border-slate-300 transition-colors">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <FileText className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Performance Report (PDF)</CardTitle>
                                        <CardDescription>Summary report with trends</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-sm text-slate-600">
                                        <p>Includes:</p>
                                        <ul className="list-disc list-inside mt-1 text-slate-500">
                                            <li>Performance summary table</li>
                                            <li>Period comparison (vs previous)</li>
                                            <li>Daily metrics breakdown</li>
                                            <li>Trend percentages</li>
                                        </ul>
                                    </div>
                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={handleExportPDF}
                                        disabled={isExportingPDF}
                                    >
                                        {isExportingPDF ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download PDF
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-xs text-slate-400 text-center">
                                        PDF uses {period === '7d' || period === '14d' ? '7 day' : '30 day'} period
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Info Section */}
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-blue-100 rounded-full">
                                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-sm text-slate-600">
                                    <p className="font-medium text-slate-700">About Reports</p>
                                    <p className="mt-1">
                                        CSV exports contain raw campaign data filtered by your selected platform and status.
                                        PDF reports provide a formatted summary with period-over-period comparisons.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
