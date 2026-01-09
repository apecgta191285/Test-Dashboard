import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type Platform = 'ALL' | 'GOOGLE_ADS' | 'FACEBOOK' | 'TIKTOK' | 'LINE_ADS';

interface PlatformTabsProps {
    selectedPlatform: Platform;
    onPlatformChange: (platform: Platform) => void;
    className?: string;
}

const PLATFORMS: { value: Platform; label: string; color: string }[] = [
    { value: 'ALL', label: 'All Platforms', color: 'bg-slate-500' },
    { value: 'GOOGLE_ADS', label: 'Google Ads', color: 'bg-green-500' },
    { value: 'FACEBOOK', label: 'Facebook', color: 'bg-blue-500' },
    { value: 'TIKTOK', label: 'TikTok', color: 'bg-black' },
    { value: 'LINE_ADS', label: 'LINE', color: 'bg-green-600' },
];

export function PlatformTabs({ selectedPlatform, onPlatformChange, className }: PlatformTabsProps) {
    return (
        <Tabs value={selectedPlatform} onValueChange={(v) => onPlatformChange(v as Platform)} className={className}>
            <TabsList className="bg-slate-100 p-1">
                {PLATFORMS.map((platform) => (
                    <TabsTrigger
                        key={platform.value}
                        value={platform.value}
                        className={cn(
                            "data-[state=active]:bg-white data-[state=active]:shadow-sm",
                            "flex items-center gap-2 px-4 py-2"
                        )}
                    >
                        <span
                            className={cn(
                                "w-2 h-2 rounded-full",
                                selectedPlatform === platform.value ? platform.color : "bg-slate-300"
                            )}
                        />
                        {platform.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
