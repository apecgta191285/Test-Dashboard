import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface MetricItem {
    title: string;
    value: string | number;
    trend?: {
        value: number;
        isPositive: boolean;
        label?: string;
    };
    icon?: React.ReactNode;
    iconClassName?: string;
    description?: string;
    badge?: React.ReactNode;
}

interface MetricGridProps {
    metrics: MetricItem[];
    isLoading?: boolean;
    columns?: number;
}

export function MetricGrid({ metrics, isLoading, columns = 4 }: MetricGridProps) {
    if (isLoading) {
        return (
            <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-${columns}`}>
                {Array.from({ length: columns }).map((_, i) => (
                    <Card key={i} className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex justify-between mb-4">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-32" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-${columns}`}>
            {metrics.map((metric, index) => (
                <Card key={index} className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                    <CardContent className="p-4">
                        {/* Top Row: Icon and Trend */}
                        <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-lg ${metric.iconClassName || 'bg-slate-100 text-slate-600'}`}>
                                {metric.icon}
                            </div>
                            {metric.trend && (
                                <div className="mt-1 flex items-center gap-1 text-xs">
                                    {metric.trend.value > 0 ? (
                                        <ArrowUp className="w-3 h-3 text-green-600" />
                                    ) : metric.trend.value < 0 ? (
                                        <ArrowDown className="w-3 h-3 text-red-600" />
                                    ) : null}
                                    <span className={`font-medium ${metric.trend.value > 0 ? 'text-green-500' :
                                            metric.trend.value < 0 ? 'text-red-500' : 'text-slate-500'
                                        }`}>
                                        {Math.abs(metric.trend.value).toFixed(1)}%
                                    </span>
                                    {metric.trend.label && (
                                        <span className="text-muted-foreground hidden sm:inline">{metric.trend.label}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bottom Row: Label and Value */}
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-500 truncate">{metric.title}</p>
                                {metric.badge}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{metric.value}</h3>
                            {metric.description && (
                                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
