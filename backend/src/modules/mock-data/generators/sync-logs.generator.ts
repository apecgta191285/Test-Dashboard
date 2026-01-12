/**
 * Sync Logs Generator
 * สร้าง mock sync logs สำหรับแสดงประวัติการ sync
 */

import { SyncStatus, SyncType, AdPlatform } from '@prisma/client';

interface MockSyncLog {
    platform: AdPlatform;
    status: SyncStatus;
    syncType: SyncType;
    recordsCount: number;
    errorMessage?: string;
    daysAgo: number;
}

/**
 * Mock Sync Log Templates
 */
export const MOCK_SYNC_LOGS: MockSyncLog[] = [
    // วันนี้
    {
        platform: AdPlatform.GOOGLE_ADS,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.SCHEDULED,
        recordsCount: 156,
        daysAgo: 0,
    },
    {
        platform: AdPlatform.FACEBOOK,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.SCHEDULED,
        recordsCount: 89,
        daysAgo: 0,
    },
    {
        platform: AdPlatform.GOOGLE_ANALYTICS,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.SCHEDULED,
        recordsCount: 30,
        daysAgo: 0,
    },
    // เมื่อวาน
    {
        platform: AdPlatform.GOOGLE_ADS,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.SCHEDULED,
        recordsCount: 142,
        daysAgo: 1,
    },
    {
        platform: AdPlatform.TIKTOK,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.MANUAL,
        recordsCount: 45,
        daysAgo: 1,
    },
    {
        platform: AdPlatform.LINE_ADS,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.INITIAL,
        recordsCount: 28,
        daysAgo: 1,
    },
    // 2 วันก่อน
    {
        platform: AdPlatform.GOOGLE_ADS,
        status: SyncStatus.FAILED,
        syncType: SyncType.SCHEDULED,
        recordsCount: 0,
        errorMessage: 'API rate limit exceeded. Retry in 60 seconds.',
        daysAgo: 2,
    },
    {
        platform: AdPlatform.GOOGLE_ADS,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.SCHEDULED,
        recordsCount: 138,
        daysAgo: 2,
    },
    {
        platform: AdPlatform.FACEBOOK,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.SCHEDULED,
        recordsCount: 76,
        daysAgo: 2,
    },
    // 3 วันก่อน
    {
        platform: AdPlatform.GOOGLE_ANALYTICS,
        status: SyncStatus.FAILED,
        syncType: SyncType.SCHEDULED,
        recordsCount: 0,
        errorMessage: 'Invalid credentials. Please reconnect your account.',
        daysAgo: 3,
    },
    {
        platform: AdPlatform.GOOGLE_ADS,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.SCHEDULED,
        recordsCount: 145,
        daysAgo: 3,
    },
    // 5 วันก่อน
    {
        platform: AdPlatform.FACEBOOK,
        status: SyncStatus.SUCCESS,
        syncType: SyncType.INITIAL,
        recordsCount: 234,
        daysAgo: 5,
    },
    {
        platform: AdPlatform.GOOGLE_ADS,
        status: SyncStatus.COMPLETED,
        syncType: SyncType.INITIAL,
        recordsCount: 567,
        daysAgo: 5,
    },
];

/**
 * สร้าง mock sync log สำหรับบันทึกลง database
 */
export function generateSyncLogForDB(tenantId: string, template: MockSyncLog) {
    const now = new Date();
    const startedAt = new Date(now);
    startedAt.setDate(startedAt.getDate() - template.daysAgo);
    startedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const completedAt = template.status === SyncStatus.SUCCESS || template.status === SyncStatus.COMPLETED || template.status === SyncStatus.FAILED
        ? new Date(startedAt.getTime() + Math.random() * 60000 * 5) // 0-5 minutes later
        : null;

    return {
        tenantId,
        platform: template.platform,
        accountId: `mock-${template.platform.toLowerCase()}-001`,
        syncType: template.syncType,
        status: template.status,
        startedAt,
        completedAt,
        errorMessage: template.errorMessage || null,
        recordsCount: template.recordsCount,
        recordsSync: template.recordsCount,
    };
}

/**
 * สร้าง array ของ sync logs
 */
export function generateMockSyncLogs(count: number = 12): MockSyncLog[] {
    return MOCK_SYNC_LOGS.slice(0, count);
}
