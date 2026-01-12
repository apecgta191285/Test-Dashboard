// src/types/enums.ts
// ⚠️ CRITICAL: Must match @prisma/client enums exactly!

// =============================================================================
// USER ROLES
// =============================================================================
export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CLIENT: 'CLIENT',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// =============================================================================
// CAMPAIGN STATUS
// =============================================================================
export const CampaignStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DELETED: 'DELETED',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

// =============================================================================
// AD PLATFORM
// =============================================================================
export const AdPlatform = {
  GOOGLE_ADS: 'GOOGLE_ADS',
  FACEBOOK: 'FACEBOOK',
  TIKTOK: 'TIKTOK',
  LINE_ADS: 'LINE_ADS',
  GOOGLE_ANALYTICS: 'GOOGLE_ANALYTICS',
} as const;
export type AdPlatform = (typeof AdPlatform)[keyof typeof AdPlatform];

// =============================================================================
// ALERT SEVERITY
// =============================================================================
export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

// =============================================================================
// ALERT STATUS
// =============================================================================
export const AlertStatus = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const;
export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

// =============================================================================
// NOTIFICATION CHANNEL
// =============================================================================
export const NotificationChannel = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  LINE: 'LINE',
  SMS: 'SMS',
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

// =============================================================================
// SYNC STATUS
// =============================================================================
export const SyncStatus = {
  PENDING: 'PENDING',
  STARTED: 'STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

// =============================================================================
// SYNC TYPE
// =============================================================================
export const SyncType = {
  INITIAL: 'INITIAL',
  SCHEDULED: 'SCHEDULED',
  MANUAL: 'MANUAL',
} as const;
export type SyncType = (typeof SyncType)[keyof typeof SyncType];

// =============================================================================
// ALERT RULE TYPE
// =============================================================================
export const AlertRuleType = {
  PRESET: 'PRESET',
  CUSTOM: 'CUSTOM',
} as const;
export type AlertRuleType = (typeof AlertRuleType)[keyof typeof AlertRuleType];
