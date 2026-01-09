import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw, X } from 'lucide-react';
import { useAlerts, useOpenAlertsCount, useCheckAlerts, useResolveAlert, useAcknowledgeAlert } from '@/hooks/useAlerts';
import { Alert } from '@/services/alert-service';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

const SEVERITY_CONFIG = {
    CRITICAL: {
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50 border-red-200',
        badge: 'bg-red-100 text-red-700 border-red-200',
    },
    WARNING: {
        icon: AlertCircle,
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200',
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    INFO: {
        icon: Info,
        color: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-200',
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
    },
};

interface AlertItemProps {
    alert: Alert;
    onAcknowledge: (id: string) => void;
    onResolve: (id: string) => void;
}

function AlertItem({ alert, onAcknowledge, onResolve }: AlertItemProps) {
    const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
    const Icon = config.icon;

    return (
        <div className={`p-3 rounded-lg border ${config.bg} flex items-start gap-3`}>
            <Icon className={`w-5 h-5 mt-0.5 ${config.color}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-slate-900 truncate">
                        {alert.title}
                    </span>
                    <Badge variant="outline" className={`text-xs ${config.badge}`}>
                        {alert.severity}
                    </Badge>
                </div>
                <p className="text-xs text-slate-600 mb-1">{alert.message}</p>
                {alert.campaign && (
                    <p className="text-xs text-slate-500">
                        Campaign: {alert.campaign.name} ({alert.campaign.platform})
                    </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: th })}
                </p>
            </div>
            <div className="flex items-center gap-1">
                {alert.status === 'OPEN' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onAcknowledge(alert.id)}
                        title="รับทราบ"
                    >
                        <CheckCircle className="w-4 h-4 text-slate-400 hover:text-green-500" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onResolve(alert.id)}
                    title="แก้ไขแล้ว"
                >
                    <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                </Button>
            </div>
        </div>
    );
}

export function AlertWidget() {
    const [showAll, setShowAll] = useState(false);

    const { data: alertCount, isLoading: isCountLoading } = useOpenAlertsCount();
    const { data: alerts, isLoading: isAlertsLoading, refetch } = useAlerts({
        status: 'OPEN',
        limit: showAll ? 50 : 5,
    });

    const checkAlerts = useCheckAlerts();
    const acknowledgeAlert = useAcknowledgeAlert();
    const resolveAlert = useResolveAlert();

    const handleRefresh = async () => {
        await checkAlerts.mutateAsync();
        refetch();
    };

    const handleAcknowledge = (id: string) => {
        acknowledgeAlert.mutate(id);
    };

    const handleResolve = (id: string) => {
        resolveAlert.mutate(id);
    };

    const totalAlerts = alertCount?.total || 0;
    const criticalCount = alertCount?.critical || 0;
    const warningCount = alertCount?.warning || 0;

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-slate-600" />
                        <CardTitle className="text-base font-semibold text-slate-800">
                            Alerts
                        </CardTitle>
                        {totalAlerts > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                {totalAlerts}
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleRefresh}
                        disabled={checkAlerts.isPending}
                    >
                        <RefreshCw className={`w-4 h-4 ${checkAlerts.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Alert Summary */}
                {totalAlerts > 0 && (
                    <div className="flex gap-2 mt-2">
                        {criticalCount > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {criticalCount} Critical
                            </Badge>
                        )}
                        {warningCount > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {warningCount} Warning
                            </Badge>
                        )}
                    </div>
                )}
            </CardHeader>

            <CardContent className="pt-0">
                {isAlertsLoading || isCountLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                ) : !alerts || alerts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                        <p className="text-sm font-medium">ไม่มี Alerts</p>
                        <p className="text-xs text-slate-400">ทุกอย่างทำงานปกติ</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {alerts.map((alert: Alert) => (
                            <AlertItem
                                key={alert.id}
                                alert={alert}
                                onAcknowledge={handleAcknowledge}
                                onResolve={handleResolve}
                            />
                        ))}

                        {totalAlerts > 5 && !showAll && (
                            <Button
                                variant="ghost"
                                className="w-full text-sm"
                                onClick={() => setShowAll(true)}
                            >
                                View All ({totalAlerts} alerts)
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
