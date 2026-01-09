import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Campaign } from '../types';

interface TopCampaignsTableProps {
    campaigns: Campaign[];
}

export const TopCampaignsTable = ({ campaigns }: TopCampaignsTableProps) => {
    return (
        <Card>
            <CardHeader className="border-b border-slate-50 pb-4">
                <CardTitle className="text-base font-semibold text-slate-800">Top Campaigns</CardTitle>
                <CardDescription>Your best performing campaigns by revenue (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
                {campaigns.length === 0 ? (
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
                                {campaigns.map((campaign) => {
                                    const metrics = campaign.metrics || {};
                                    const platform = campaign.platform || 'Unknown';
                                    const platformDisplay = typeof platform === 'string'
                                        ? platform.replace(/_/g, ' ')
                                        : 'Unknown';

                                    return (
                                        <tr key={campaign.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div>
                                                    <div className="font-semibold text-slate-800">{campaign.name || 'Unnamed Campaign'}</div>
                                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${(campaign.status || '').toUpperCase() === 'ACTIVE'
                                                            ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                                            : 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/10'
                                                            }`}>
                                                            {campaign.status || 'UNKNOWN'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-center py-4 px-4">
                                                <div className="flex justify-center">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${platformDisplay.toLowerCase().includes('google') ? 'bg-blue-500' :
                                                        platformDisplay.toLowerCase().includes('facebook') ? 'bg-blue-600' :
                                                            platformDisplay.toLowerCase().includes('tiktok') ? 'bg-black' : 'bg-slate-400'
                                                        }`}>
                                                        {platformDisplay.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
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
    );
};
