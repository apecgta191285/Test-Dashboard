import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

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

export function OverviewChart({ data, isLoading }: OverviewChartProps) {
    const [selectedMetric, setSelectedMetric] = useState<string>('spend');

    // Transform data for chart
    const chartData = data.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: item[selectedMetric as keyof TrendData] as number,
    }));

    const metricConfig = {
        spend: { label: 'Spend', color: '#8b5cf6', format: (val: number) => `$${val.toFixed(2)}` },
        impressions: { label: 'Impressions', color: '#3b82f6', format: (val: number) => val.toLocaleString() },
        clicks: { label: 'Clicks', color: '#10b981', format: (val: number) => val.toLocaleString() },
        conversions: { label: 'Conversions', color: '#f59e0b', format: (val: number) => val.toLocaleString() },
    };

    const currentConfig = metricConfig[selectedMetric as keyof typeof metricConfig];

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Performance Trends</CardTitle>
                    <CardDescription>Loading chart data...</CardDescription>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Performance Trends</CardTitle>
                        <CardDescription>Track your metrics over time</CardDescription>
                    </div>
                    <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="spend">Spend</SelectItem>
                            <SelectItem value="impressions">Impressions</SelectItem>
                            <SelectItem value="clicks">Clicks</SelectItem>
                            <SelectItem value="conversions">Conversions</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="date"
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={currentConfig.format}
                        />
                        <Tooltip
                            formatter={(value: number) => currentConfig.format(value)}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={currentConfig.color}
                            strokeWidth={2}
                            dot={{ fill: currentConfig.color, r: 4 }}
                            activeDot={{ r: 6 }}
                            name={currentConfig.label}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
