/**
 * Application Constants
 * รวบรวมค่าคงที่ที่ใช้ทั่วทั้งแอปพลิเคชัน
 */

// ============================================
// Cache TTL (Time To Live)
// ============================================
export const CACHE_TTL = {
    /** 10 นาที */
    TEN_MINUTES: 600000,
    /** 30 นาที */
    THIRTY_MINUTES: 1800000,
    /** 1 ชั่วโมง */
    ONE_HOUR: 3600000,
    /** 6 ชั่วโมง */
    SIX_HOURS: 21600000,
} as const;

// ============================================
// Sync Defaults
// ============================================
export const SYNC_DEFAULTS = {
    /** จำนวนวันที่ sync ย้อนหลัง */
    DAYS_TO_SYNC: 30,
    /** จำนวน records ต่อ page */
    PAGE_SIZE: 1000,
} as const;

// ============================================
// Health Check
// ============================================
export const HEALTH_CHECK = {
    /** Memory threshold (500MB) */
    MEMORY_THRESHOLD_BYTES: 500 * 1024 * 1024,
} as const;

// ============================================
// Google Ads
// ============================================
export const GOOGLE_ADS = {
    /** ตัวหารแปลง micros เป็น currency */
    MICROS_TO_CURRENCY: 1000000,
} as const;

// ============================================
// Token Expiry
// ============================================
export const TOKEN_EXPIRY = {
    /** 5 นาที (ใช้เช็คก่อน refresh) */
    REFRESH_THRESHOLD_MS: 5 * 60 * 1000,
} as const;

// ============================================
// Pagination
// ============================================
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
} as const;
