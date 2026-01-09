import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

export function DeviceBreakdownWidget() {
    // Mock data for device breakdown
    const data = [
        { device: 'Mobile', value: 65, icon: Smartphone, color: 'bg-indigo-500' },
        { device: 'Desktop', value: 30, icon: Monitor, color: 'bg-purple-500' },
        { device: 'Tablet', value: 5, icon: Tablet, color: 'bg-pink-500' },
    ];

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800">Device Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 mt-2">
                    {/* Visual Bar Chart */}
                    <div className="flex h-32 items-end justify-center gap-4 border-b border-slate-100 pb-4">
                        {data.map((item) => (
                            <div key={item.device} className="flex flex-col items-center gap-2 group">
                                <div className="relative w-12 rounded-t-lg bg-slate-100 overflow-hidden">
                                    <div
                                        className={`w-full transition-all duration-500 ${item.color} opacity-80 group-hover:opacity-100`}
                                        style={{ height: `${item.value * 1.2}px` }} // Scale for visual
                                    />
                                </div>
                                <span className="text-xs font-medium text-slate-600">{item.device}</span>
                            </div>
                        ))}
                    </div>

                    {/* Legend / Details */}
                    <div className="space-y-2">
                        {data.map((item) => (
                            <div key={item.device} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <item.icon className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-600">{item.device}</span>
                                </div>
                                <span className="font-semibold text-slate-900">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
