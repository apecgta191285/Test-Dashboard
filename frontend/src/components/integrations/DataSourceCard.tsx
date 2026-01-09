import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface DataSourceCardProps {
    name: string;
    description: string;
    icon: any;
    color: string;
    isConnected: boolean;
    isConnecting?: boolean;
    isSyncing?: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onSync?: () => void;
    children?: React.ReactNode;
}

export function DataSourceCard({
    name,
    description,
    icon: Icon,
    color,
    isConnected,
    isConnecting = false,
    isSyncing = false,
    onConnect,
    onDisconnect,
    children
}: DataSourceCardProps) {
    return (
        <div className="flex flex-col h-full p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
                    <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
                </div>
                {isConnected && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connected
                    </span>
                )}
            </div>

            <div className="mb-6 flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
            </div>

            <div className="space-y-3 mt-auto">
                {children}

                {!isConnected ? (
                    <Button
                        className="w-full"
                        onClick={onConnect}
                        disabled={isConnecting}
                    >
                        {isConnecting ? (
                            <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                            <>
                                Connect
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        {onDisconnect && (
                            <Button
                                variant="outline"
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                                onClick={onDisconnect}
                                disabled={isSyncing}
                            >
                                Disconnect
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
