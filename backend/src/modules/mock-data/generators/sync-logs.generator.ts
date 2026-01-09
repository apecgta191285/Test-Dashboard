/**
 * Sync Logs Generator
 * สร้าง mock sync logs สำหรับแสดงประวัติการ sync
 */

export type SyncStatus = 'PENDING' | 'STARTED' | 'IN_PROGRESS' | 'SUCCESS' | 'COMPLETED' | 'FAILED';
export type PlatformType = 'GOOGLE_ADS' | 'FACEBOOK' | 'TIKTOK' | 'LINE_ADS' | 'GOOGLE_ANALYTICS';

interface MockSyncLog {
    platform: PlatformType;
    status: SyncStatus;
    syncType: 'INITIAL' | 'SCHEDULED' | 'MANUAL';
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
        platform: 'GOOGLE_ADS',
        status: 'SUCCESS',
        syncType: 'SCHEDULED',
        recordsCount: 156,
        daysAgo: 0,
    },
    {
        platform: 'FACEBOOK',
        status: 'SUCCESS',
        syncType: 'SCHEDULED',
        recordsCount: 89,
        daysAgo: 0,
    },
    {
        platform: 'GOOGLE_ANALYTICS',
        status: 'SUCCESS',
        syncType: 'SCHEDULED',
        recordsCount: 30,
        daysAgo: 0,
    },
    // เมื่อวาน
    {
        platform: 'GOOGLE_ADS',
        status: 'SUCCESS',
        syncType: 'SCHEDULED',
        recordsCount: 142,
        daysAgo: 1,
    },
    {
        platform: 'TIKTOK',
        status: 'SUCCESS',
        syncType: 'MANUAL',
        recordsCount: 45,
        daysAgo: 1,
    },
    {
        platform: 'LINE_ADS',
        status: 'SUCCESS',
        syncType: 'INITIAL',
        recordsCount: 28,
        daysAgo: 1,
    },
    // 2 วันก่อน
    {
        platform: 'GOOGLE_ADS',
        status: 'FAILED',
        syncType: 'SCHEDULED',
        recordsCount: 0,
        errorMessage: 'API rate limit exceeded. Retry in 60 seconds.',
        daysAgo: 2,
    },
    {
        platform: 'GOOGLE_ADS',
        status: 'SUCCESS',
        syncType: 'SCHEDULED',
        recordsCount: 138,
        daysAgo: 2,
    },
    {
        platform: 'FACEBOOK',
        status: 'SUCCESS',
        syncType: 'SCHEDULED',
        recordsCount: 76,
        daysAgo: 2,
    },
    // 3 วันก่อน
    {
        platform: 'GOOGLE_ANALYTICS',
        status: 'FAILED',
        syncType: 'SCHEDULED',
        recordsCount: 0,
        errorMessage: 'Invalid credentials. Please reconnect your account.',
        daysAgo: 3,
    },
    {
        platform: 'GOOGLE_ADS',
        status: 'SUCCESS',
        syncType: 'SCHEDULED',
        recordsCount: 145,
        daysAgo: 3,
    },
    // 5 วันก่อน
    {
        platform: 'FACEBOOK',
        status: 'SUCCESS',
        syncType: 'INITIAL',
        recordsCount: 234,
        daysAgo: 5,
    },
    {
        platform: 'GOOGLE_ADS',
        status: 'COMPLETED',
        syncType: 'INITIAL',
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

    const completedAt = template.status === 'SUCCESS' || template.status === 'COMPLETED' || template.status === 'FAILED'
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
