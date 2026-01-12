// src/lib/enum-mappers.ts
import {
    CampaignStatus,
    AlertSeverity,
    AdPlatform,
    UserRole,
} from '@/types/enums';

// =============================================================================
// Campaign Status → Badge Config
// =============================================================================
export const campaignStatusConfig: Record<
    CampaignStatus,
    {
        label: string;
        variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
        icon: string;
    }
> = {
    [CampaignStatus.ACTIVE]: { label: 'Active', variant: 'success', icon: '🟢' },
    [CampaignStatus.PAUSED]: { label: 'Paused', variant: 'warning', icon: '⏸️' },
    [CampaignStatus.PENDING]: {
        label: 'Pending',
        variant: 'secondary',
        icon: '⏳',
    },
    [CampaignStatus.COMPLETED]: {
        label: 'Completed',
        variant: 'default',
        icon: '✅',
    },
    [CampaignStatus.DELETED]: {
        label: 'Deleted',
        variant: 'destructive',
        icon: '🗑️',
    },
};

// =============================================================================
// Alert Severity → Badge Config
// =============================================================================
export const alertSeverityConfig: Record<
    AlertSeverity,
    {
        label: string;
        variant: 'default' | 'secondary' | 'destructive';
        className: string;
    }
> = {
    [AlertSeverity.INFO]: {
        label: 'Info',
        variant: 'secondary',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    },
    [AlertSeverity.WARNING]: {
        label: 'Warning',
        variant: 'default',
        className:
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    },
    [AlertSeverity.CRITICAL]: {
        label: 'Critical',
        variant: 'destructive',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    },
};

// =============================================================================
// Ad Platform → Display Config
// =============================================================================
export const platformConfig: Record<
    AdPlatform,
    {
        name: string;
        icon: string;
        color: string;
    }
> = {
    [AdPlatform.GOOGLE_ADS]: {
        name: 'Google Ads',
        icon: '🔍',
        color: '#4285F4',
    },
    [AdPlatform.FACEBOOK]: {
        name: 'Facebook',
        icon: '📘',
        color: '#1877F2',
    },
    [AdPlatform.TIKTOK]: {
        name: 'TikTok',
        icon: '🎵',
        color: '#000000',
    },
    [AdPlatform.LINE_ADS]: {
        name: 'LINE Ads',
        icon: '💬',
        color: '#00B900',
    },
    [AdPlatform.GOOGLE_ANALYTICS]: {
        name: 'Google Analytics',
        icon: '📊',
        color: '#E37400',
    },
};

// =============================================================================
// User Role → Display Config
// =============================================================================
export const userRoleConfig: Record<
    UserRole,
    {
        label: string;
        variant: 'default' | 'secondary' | 'destructive';
    }
> = {
    [UserRole.ADMIN]: { label: 'Admin', variant: 'destructive' },
    [UserRole.MANAGER]: { label: 'Manager', variant: 'default' },
    [UserRole.CLIENT]: { label: 'Client', variant: 'secondary' },
    [UserRole.VIEWER]: { label: 'Viewer', variant: 'secondary' },
};

// =============================================================================
// Helper Functions
// =============================================================================
export function getCampaignStatusLabel(status: string): string {
    return (
        campaignStatusConfig[status as CampaignStatus]?.label ||
        status.charAt(0) + status.slice(1).toLowerCase()
    );
}

export function getPlatformName(platform: string): string {
    return platformConfig[platform as AdPlatform]?.name || platform;
}

export function getUserRoleLabel(role: string): string {
    return userRoleConfig[role as UserRole]?.label || role;
}
