import { LucideIcon, BarChart3, Facebook, MessageCircle, Share2 } from 'lucide-react';

export interface PlatformConfig {
    id: string;
    name: string;
    icon: LucideIcon;
    color: string;
    description: string;
    connectUrl?: string;
    docsUrl?: string;
}

export const PLATFORMS: PlatformConfig[] = [
    {
        id: 'google-ads',
        name: 'Google Ads',
        icon: BarChart3,
        color: 'text-blue-500',
        description: 'Connect your Google Ads account to track campaigns, costs, and conversions.',
    },
    {
        id: 'google-analytics',
        name: 'Google Analytics 4',
        icon: BarChart3,
        color: 'text-orange-500',
        description: 'Connect your GA4 property to track website traffic and user engagement.',
    },
    {
        id: 'facebook-ads',
        name: 'Facebook Ads',
        icon: Facebook,
        color: 'text-blue-600',
        description: 'Import ad performance data from Facebook/Meta Ads Manager.',
        connectUrl: '/auth/facebook/ads/url',
    },
    {
        id: 'line-ads',
        name: 'LINE Ads',
        icon: MessageCircle,
        color: 'text-green-500',
        description: 'Track LINE Ads campaigns, impressions and conversions.',
    },
    {
        id: 'tiktok-ads',
        name: 'TikTok Ads',
        icon: Share2,
        color: 'text-black',
        description: 'Monitor video views and ad spend on TikTok.',
    },
];
