import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrendData {
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
}

interface OverviewChartProps {
    data: TrendData[];
    isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-lg shadow-lg text-xs">
                <p className="font-semibold text-slate-700 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-slate-500 capitalize">{entry.name}:</span>
                        <span className="font-medium text-slate-900">
                            {entry.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export function OverviewChart({ data, isLoading }: OverviewChartProps) {
    // Transform data for chart
    const chartData = data.map(item => ({
        ...item,
        dateFormatted: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Performance Trend</CardTitle>
                    <CardDescription>Loading chart data...</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-slate-800">Performance Trend</CardTitle>
                    <CardDescription>Impressions (Left) vs Clicks (Right)</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-slate-600 border-slate-200 hover:bg-slate-50">
                    <Filter className="mr-2 h-3 w-3" />
                    Filter
                </Button>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="dateFormatted"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                dy={10}
                            />
                            {/* Left Axis: Impressions */}
                            <YAxis
                                yAxisId="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6366f1', fontSize: 11, fontWeight: 500 }}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            {/* Right Axis: Clicks */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#f59e0b', fontSize: 11, fontWeight: 500 }}
                                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="impressions"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorImp)"
                                name="Impressions"
                            />
                            <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="clicks"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorClick)"
                                name="Clicks"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
