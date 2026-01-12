-- =============================================================================
-- Migration Verification SQL Queries
-- RGA Dashboard v2.0.0 (Sprint 4)
-- =============================================================================
-- Purpose: Post-deployment data integrity checks
-- Run these queries after each migration to verify data correctness
-- =============================================================================

-- =============================================================================
-- 1. USER DATA INTEGRITY CHECKS
-- =============================================================================

-- 1.1 Check for NULL or invalid UserRole values
-- Expected: 0 rows (all users should have valid roles)
SELECT 
    id,
    email,
    role,
    CASE 
        WHEN role IS NULL THEN 'NULL_ROLE'
        WHEN role NOT IN ('ADMIN', 'MANAGER', 'CLIENT', 'VIEWER') THEN 'INVALID_ROLE'
        ELSE 'OK'
    END AS issue
FROM "User"
WHERE role IS NULL 
   OR role NOT IN ('ADMIN', 'MANAGER', 'CLIENT', 'VIEWER');

-- 1.2 Check for legacy lowercase role values
-- Expected: 0 rows (no legacy formats should exist)
SELECT 
    id,
    email,
    role
FROM "User"
WHERE role::text IN ('admin', 'manager', 'client', 'viewer')
   OR role::text LIKE '%Admin%'
   OR role::text LIKE '%Manager%';

-- 1.3 Check for users with negative failedLoginCount
-- Expected: 0 rows
SELECT 
    id,
    email,
    "failedLoginCount"
FROM "User"
WHERE "failedLoginCount" < 0;

-- 1.4 Check for locked users with future lockedUntil but zero failedLoginCount
-- Expected: 0 rows (inconsistent state)
SELECT 
    id,
    email,
    "failedLoginCount",
    "lockedUntil"
FROM "User"
WHERE "lockedUntil" > NOW() 
  AND "failedLoginCount" = 0;

-- =============================================================================
-- 2. CAMPAIGN DATA INTEGRITY CHECKS
-- =============================================================================

-- 2.1 Check for NULL or invalid CampaignStatus values
-- Expected: 0 rows
SELECT 
    id,
    name,
    status,
    CASE 
        WHEN status IS NULL THEN 'NULL_STATUS'
        WHEN status NOT IN ('ACTIVE', 'PAUSED', 'DELETED', 'PENDING', 'COMPLETED') THEN 'INVALID_STATUS'
        ELSE 'OK'
    END AS issue
FROM "Campaign"
WHERE status IS NULL 
   OR status NOT IN ('ACTIVE', 'PAUSED', 'DELETED', 'PENDING', 'COMPLETED');

-- 2.2 Check for legacy lowercase status values (case-sensitive check)
-- Expected: 0 rows
SELECT 
    id,
    name,
    status::text AS status_raw
FROM "Campaign"
WHERE status::text IN ('active', 'paused', 'deleted', 'pending', 'completed')
   OR status::text LIKE '%Active%'
   OR status::text ~ '^[a-z]';  -- Starts with lowercase

-- 2.3 Check for invalid AdPlatform values
-- Expected: 0 rows
SELECT 
    id,
    name,
    platform
FROM "Campaign"
WHERE platform IS NULL 
   OR platform NOT IN ('GOOGLE_ADS', 'FACEBOOK', 'TIKTOK', 'LINE_ADS', 'GOOGLE_ANALYTICS');

-- =============================================================================
-- 3. NOTIFICATION DATA INTEGRITY CHECKS
-- =============================================================================

-- 3.1 Check for invalid NotificationChannel values
-- Expected: 0 rows
SELECT 
    id,
    title,
    channel
FROM "Notification"
WHERE channel IS NULL 
   OR channel NOT IN ('IN_APP', 'EMAIL', 'LINE', 'SMS');

-- 3.2 Check for notifications marked as read but without readAt timestamp
-- Expected: 0 rows (inconsistent state)
SELECT 
    id,
    title,
    "isRead",
    "readAt"
FROM "Notification"
WHERE "isRead" = true 
  AND "readAt" IS NULL;

-- =============================================================================
-- 4. ALERT DATA INTEGRITY CHECKS
-- =============================================================================

-- 4.1 Check for invalid AlertSeverity values
-- Expected: 0 rows
SELECT 
    id,
    title,
    severity
FROM "Alert"
WHERE severity IS NULL 
   OR severity NOT IN ('INFO', 'WARNING', 'CRITICAL');

-- 4.2 Check for invalid AlertStatus values
-- Expected: 0 rows
SELECT 
    id,
    title,
    status
FROM "Alert"
WHERE status IS NULL 
   OR status NOT IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- =============================================================================
-- 5. SYNC LOG DATA INTEGRITY CHECKS
-- =============================================================================

-- 5.1 Check for invalid SyncStatus values
-- Expected: 0 rows
SELECT 
    id,
    status
FROM "SyncLog"
WHERE status IS NULL 
   OR status NOT IN ('PENDING', 'STARTED', 'IN_PROGRESS', 'SUCCESS', 'COMPLETED', 'FAILED');

-- =============================================================================
-- 6. REFERENTIAL INTEGRITY CHECKS
-- =============================================================================

-- 6.1 Orphan notifications (user deleted)
-- Expected: 0 rows
SELECT n.id, n.title, n."userId"
FROM "Notification" n
LEFT JOIN "User" u ON n."userId" = u.id
WHERE u.id IS NULL;

-- 6.2 Orphan campaigns (tenant deleted)
-- Expected: 0 rows
SELECT c.id, c.name, c."tenantId"
FROM "Campaign" c
LEFT JOIN "Tenant" t ON c."tenantId" = t.id
WHERE t.id IS NULL;

-- =============================================================================
-- 7. SUMMARY REPORT
-- =============================================================================

-- Generate a summary of potential issues
SELECT 'User Role Issues' AS check_type, COUNT(*) AS issue_count
FROM "User" 
WHERE role IS NULL OR role NOT IN ('ADMIN', 'MANAGER', 'CLIENT', 'VIEWER')

UNION ALL

SELECT 'Campaign Status Issues', COUNT(*)
FROM "Campaign" 
WHERE status IS NULL OR status NOT IN ('ACTIVE', 'PAUSED', 'DELETED', 'PENDING', 'COMPLETED')

UNION ALL

SELECT 'Notification Channel Issues', COUNT(*)
FROM "Notification" 
WHERE channel IS NULL OR channel NOT IN ('IN_APP', 'EMAIL', 'LINE', 'SMS')

UNION ALL

SELECT 'Alert Severity Issues', COUNT(*)
FROM "Alert" 
WHERE severity IS NULL OR severity NOT IN ('INFO', 'WARNING', 'CRITICAL')

UNION ALL

SELECT 'SyncLog Status Issues', COUNT(*)
FROM "SyncLog" 
WHERE status IS NULL OR status NOT IN ('PENDING', 'STARTED', 'IN_PROGRESS', 'SUCCESS', 'COMPLETED', 'FAILED');

-- =============================================================================
-- ALL CHECKS SHOULD RETURN 0 ROWS OR issue_count = 0
-- If any issues found, investigate and fix before proceeding
-- =============================================================================
