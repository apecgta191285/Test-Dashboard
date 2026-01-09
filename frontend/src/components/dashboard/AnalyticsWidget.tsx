import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, MousePointerClick, Activity, LinkIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import { useDateRange } from "@/contexts/DateRangeContext";

interface AnalyticsData {
    connected: boolean;
    isMockData?: boolean;
    message?: string;
    error?: boolean;
    totals: {
        activeUsers: number;
        sessions: number;
        newUsers: number;
        engagementRate: number;
    } | null;
    rows: any[];
}

// GA4 Icon component defined outside to prevent re-creation on every render
const GA4Icon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-orange-500" fill="currentColor">
        <path d="M22.84 2.998A12.007 12.007 0 0 0 12.044 0C5.426 0 .008 5.405 0 12.024c-.004 3.176 1.23 6.157 3.476 8.396a11.946 11.946 0 0 0 8.496 3.58h.06c3.203 0 6.205-1.27 8.456-3.576 2.246-2.305 3.48-5.357 3.476-8.595-.004-3.24-1.248-6.284-3.504-8.566a12.007 12.007 0 0 0 1.36-1.265zM12.044 2c4.962 0 9.132 3.522 10.063 8.195l-6.28-3.627a2 2 0 0 0-2.736.732l-1.091 1.89-1.09-1.89a2 2 0 0 0-2.737-.732L1.94 10.196C2.87 5.522 7.04 2 12.044 2zm0 20c-4.963 0-9.134-3.522-10.065-8.195l6.28 3.627a2 2 0 0 0 2.737-.732l1.09-1.89 1.091 1.89a2 2 0 0 0 2.736.732l6.28-3.627C21.178 18.478 17.008 22 12.044 22z" />
    </svg>
);

export function AnalyticsWidget() {
    // ✅ Use global date range context
    const { dateRange, dateRangeLabel, startDateString } = useDateRange();

    const { data, isLoading, error } = useQuery<AnalyticsData>({
        queryKey: ['analytics', 'basic', dateRange], // Include dateRange in query key for refetch
        queryFn: async () => {
            const response = await apiClient.get(`/integrations/google-analytics/basic?startDate=${startDateString}`);
            return response.data;
        },
        // Refresh every 5 minutes
        refetchInterval: 5 * 60 * 1000,
    });

    if (isLoading) {
        return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="h-4 w-24 bg-muted rounded"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 w-16 bg-muted rounded"></div>
                    </CardContent>
                </Card>
            ))}
        </div>;
    }

    if (error) {
        return <div className="p-4 text-red-500">Failed to load analytics data</div>;
    }

    // ✅ FIX: Handle not connected case - show connect prompt instead of mock data
    // ✅ FIX: Handle not connected case - show 0 values with "Not Connected" badge
    if (!data?.connected) {
        const emptyStats = [
            { title: "Active Users", value: "0", icon: Users, description: "Not Connected" },
            { title: "New Users", value: "0", icon: UserPlus, description: "Not Connected" },
            { title: "Sessions", value: "0", icon: MousePointerClick, description: "Not Connected" },
            { title: "Engagement Rate", value: "0%", icon: Activity, description: "Not Connected" },
        ];

        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">Website Analytics</h2>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full border">
                        Not Connected
                    </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {emptyStats.map((stat, index) => (
                        <Card key={index} className="opacity-70">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.title}
                                </CardTitle>
                                <div className="flex items-center gap-1">
                                    <GA4Icon />
                                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Show error state if connected but error fetching
    if (data?.error) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Website Analytics</h2>
                <Card className="border-orange-500/50 bg-orange-500/10">
                    <CardContent className="py-4">
                        <p className="text-sm text-orange-600">{data.message || 'ไม่สามารถดึงข้อมูล GA4 ได้'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }



    const stats = [
        {
            title: "Active Users",
            value: data?.totals?.activeUsers?.toLocaleString() || '0',
            icon: Users,
            description: dateRangeLabel,
            source: "ga4" as const,
        },
        {
            title: "New Users",
            value: data?.totals?.newUsers?.toLocaleString() || '0',
            icon: UserPlus,
            description: dateRangeLabel,
            source: "ga4" as const,
        },
        {
            title: "Sessions",
            value: data?.totals?.sessions?.toLocaleString() || '0',
            icon: MousePointerClick,
            description: dateRangeLabel,
            source: "ga4" as const,
        },
        {
            title: "Engagement Rate",
            value: `${((data?.totals?.engagementRate || 0) * 100).toFixed(1)}%`,
            icon: Activity,
            description: "Average",
            source: "ga4" as const,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">Website Analytics</h2>
                {data?.isMockData && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Demo Data
                    </span>
                )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                                <GA4Icon />
                                <stat.icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
