import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboardAPI } from '@/lib/api';
import { Loader2, ArrowUpRight, ArrowDownRight, Eye, MousePointer, DollarSign, Zap, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OverviewChart } from '@/components/OverviewChart';
import { toast } from 'sonner';
interface KPI {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    trendLabel?: string;
}
interface Campaign {
    id: string;
    name: string;
    platform: string;
    status: string;
    metrics: {
        spend: number;
        revenue: number;
        conversions: number;
        roas: number;
        clicks: number;
        impressions: number;
        ctr: number;
    };
}
interface TrendData {
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
}
function TrendIndicator({ value, label }: { value: number; label: string }) {
    const isPositive = value > 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    return (
        <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
            <Icon className="w-3 h-3" />
            <span className="font-medium">{Math.abs(value).toFixed(1)}%</span>
            <span className="text-muted-foreground">{label}</span>
        </div>
    );
}
export default function Dashboard() {
    const [overview, setOverview] = useState<any>(null);
    const [topCampaigns, setTopCampaigns] = useState<Campaign[]>([]);
    const [trendsData, setTrendsData] = useState<TrendData[]>([]);
    const [dateRange, setDateRange] = useState<number>(30);
    const [isLoading, setIsLoading] = useState(true);
    const [isTrendsLoading, setIsTrendsLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                setError('');
                const [overviewRes, campaignsRes] = await Promise.all([
                    dashboardAPI.getSummary(),
                    dashboardAPI.getTopCampaigns(5, 'revenue'),
                ]);
                setOverview(overviewRes.data);
                setTopCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : []);
            } catch (err: any) {
                console.error('Dashboard error:', err);
                setError(err.response?.data?.message || 'Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);
    useEffect(() => {
        const fetchTrends = async () => {
            try {
                setIsTrendsLoading(true);
                const response = await dashboardAPI.getTrends(dateRange);
                setTrendsData(response.data);
            } catch (err: any) {
                console.error('Trends error:', err);
                toast.error('Failed to load trends data');
            } finally {
                setIsTrendsLoading(false);
            }
        };
        fetchTrends();
    }, [dateRange]);
    const handleExport = () => {
        try {
            const csvRows = [];
            csvRows.push('Metric,Value');
            csvRows.push(`Total Spend,$${(overview?.totalSpend || 0).toFixed(2)}`);
            csvRows.push(`Total Impressions,${(overview?.totalImpressions || 0).toLocaleString()}`);
            csvRows.push(`Total Clicks,${(overview?.totalClicks || 0).toLocaleString()}`);
            csvRows.push(`Total Conversions,${(overview?.totalConversions || 0).toLocaleString()}`);
            csvRows.push('');
            csvRows.push('Top Campaigns');
            csvRows.push('Name,Platform,Status,Impressions,Clicks,CTR,Spend,Revenue,ROAS');
            topCampaigns.forEach(campaign => {
                const m = campaign.metrics || {};
                csvRows.push(
                    `"${campaign.name}",${campaign.platform},${campaign.status},${m.impressions || 0},${m.clicks || 0},${(m.ctr || 0).toFixed(2)}%,$${(m.spend || 0).toFixed(2)},$${(m.revenue || 0).toFixed(2)},${(m.roas || 0).toFixed(2)}x`
                );
            });
            const csvContent = csvRows.join('\\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `dashboard-report-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Report exported successfully');
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export report');
        }
    };
    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                        <p className="text-muted-foreground">Loading dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }
    const kpiData = overview || {};
    const trends = overview?.trends || {};
    const kpis: KPI[] = [
        {
            label: 'Total Spend',
            value: `$${(kpiData.totalSpend || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <DollarSign className="w-5 h-5" />,
            trend: trends.spend || 0,
            trendLabel: 'vs last 30 days',
        },
        {
            label: 'Total Impressions',
            value: (kpiData.totalImpressions || 0).toLocaleString('en-US'),
            icon: <Eye className="w-5 h-5" />,
            trend: trends.impressions || 0,
            trendLabel: 'vs last 30 days',
        },
        {
            label: 'Total Clicks',
            value: (kpiData.totalClicks || 0).toLocaleString('en-US'),
            icon: <MousePointer className="w-5 h-5" />,
            trend: trends.clicks || 0,
            trendLabel: 'vs last 30 days',
        },
        {
            label: 'Total Conversions',
            value: (kpiData.totalConversions || 0).toLocaleString('en-US'),
            icon: <Zap className="w-5 h-5" />,
            trend: 0,
            trendLabel: 'vs last 30 days',
        },
    ];
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Dashboard</h1>
                            <p className="text-muted-foreground mt-1">Welcome back! Here's your marketing performance.</p>
                        </div>
                        <Button onClick={handleExport} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {kpis.map((kpi, index) => (
                            <Card key={index} className="hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                                    <div className="text-primary">{kpi.icon}</div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{kpi.value}</div>
                                    {kpi.trend !== undefined && kpi.trendLabel && (
                                        <div className="mt-2">
                                            <TrendIndicator value={kpi.trend} label={kpi.trendLabel} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {/* Trend Chart */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Performance Trends</h2>
                        <Select value={dateRange.toString()} onValueChange={(val) => setDateRange(parseInt(val))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                                <SelectItem value="90">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <OverviewChart data={trendsData} isLoading={isTrendsLoading} />
                    {/* Top Campaigns */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Campaigns</CardTitle>
                            <CardDescription>Your best performing campaigns by revenue (last 30 days)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {topCampaigns.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No campaigns found. Create your first campaign to get started.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="border-b">
                                            <tr>
                                                <th className="text-left py-2 px-4 font-medium">Campaign Name</th>
                                                <th className="text-center py-2 px-4 font-medium">Platform</th>
                                                <th className="text-right py-2 px-4 font-medium">Impressions</th>
                                                <th className="text-right py-2 px-4 font-medium">Clicks</th>
                                                <th className="text-right py-2 px-4 font-medium">CTR</th>
                                                <th className="text-right py-2 px-4 font-medium">Spend</th>
                                                <th className="text-right py-2 px-4 font-medium">Revenue</th>
                                                <th className="text-right py-2 px-4 font-medium">ROAS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topCampaigns.map((campaign) => {
                                                const metrics = campaign.metrics || {};
                                                const platform = campaign.platform || 'Unknown';
                                                const platformDisplay = typeof platform === 'string' 
                                                    ? platform.replace(/_/g, ' ') 
                                                    : 'Unknown';
                                                return (
                                                    <tr key={campaign.id} className="border-b hover:bg-muted/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <div>
                                                                <div className="font-medium">{campaign.name || 'Unnamed Campaign'}</div>
                                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${(campaign.status || '').toUpperCase() === 'ACTIVE'
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : 'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {campaign.status || 'UNKNOWN'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center py-3 px-4">
                                                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                                {platformDisplay}
                                                            </span>
                                                        </td>
                                                        <td className="text-right py-3 px-4 tabular-nums">
                                                            {(metrics.impressions || 0).toLocaleString('en-US')}
                                                        </td>
                                                        <td className="text-right py-3 px-4 tabular-nums">
                                                            {(metrics.clicks || 0).toLocaleString('en-US')}
                                                        </td>
                                                        <td className="text-right py-3 px-4 tabular-nums">
                                                            {(metrics.ctr || 0).toFixed(2)}%
                                                        </td>
                                                        <td className="text-right py-3 px-4 tabular-nums">
                                                            ${(metrics.spend || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="text-right py-3 px-4 tabular-nums font-medium">
                                                            ${(metrics.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="text-right py-3 px-4 tabular-nums">
                                                            <span className={`font-semibold ${(metrics.roas || 0) >= 2
                                                                ? 'text-green-600'
                                                                : (metrics.roas || 0) >= 1
                                                                    ? 'text-yellow-600'
                                                                    : 'text-red-600'
                                                                }`}>
                                                                {(metrics.roas || 0).toFixed(2)}x
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}