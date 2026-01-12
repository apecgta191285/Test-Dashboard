import type {
  UserRole,
  CampaignStatus,
  AdPlatform,
  AlertSeverity,
  NotificationChannel,
  SyncStatus,
} from './enums';

export interface Metric {
  id: string;
  tenantId: string;
  campaignId: string | null;
  date: string;
  hour: number | null;
  platform: string;
  source: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: string | null;
  organicTraffic?: number;
  bounceRate?: string;
  avgSessionDuration?: number;
  revenue?: string;
  orders?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    id: string;
    name: string;
    platform: string;
  };
}

export interface DashboardMetricPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
}

export interface CampaignMetrics {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: number;
  revenue?: number;
  roas?: number;
  ctr?: number;
  cpc?: number;
}

// Campaign extends CampaignMetrics for flat access (DRY principle)
// Also has metrics object for nested access (backward compatibility)
export interface Campaign extends CampaignMetrics {
  id: string;
  tenantId?: string;
  integrationId?: string;
  externalId?: string;
  name: string;
  platform: AdPlatform | string; // 🔄 Prefer AdPlatform, string for backward compat
  status: CampaignStatus | string; // 🔄 Prefer CampaignStatus, string for backward compat
  objective?: string;
  budget?: string | number;
  budgetType?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  lastSyncedAt?: string; // 🆕 Sprint 4
  syncStatus?: SyncStatus; // 🆕 Sprint 4
  // Nested metrics object (for TopCampaignsTable compatibility)
  metrics?: CampaignMetrics;
}

export interface Integration {
  id: string;
  tenantId: string;
  type: string;
  provider: string;
  name: string;
  credentials: Record<string, any>;
  config: Record<string, any>;
  status: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncFrequencyMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string; // Unified name
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  title?: string | null;
  location?: string | null;
  team?: string | null;
  timezone?: string | null;
  language?: string | null;
  bio?: string | null;
  social?: Record<string, string> | null;
  role: UserRole | string; // 🔄 Prefer UserRole, string for backward compat
  tenantId: string;
  tenant?: TenantInfo;
  companyName?: string;
  createdAt?: string;

  // 🆕 Sprint 4 Security Fields
  lastLoginAt?: string;
  lastLoginIp?: string;
  failedLoginCount?: number;
  lockedUntil?: string;
  twoFactorEnabled?: boolean;
  passwordChangedAt?: string;

  // 🆕 Preferences
  notificationPreferences?: Record<string, boolean>;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WebhookEvent {
  id: string;
  tenantId: string;
  platform: string;
  type: string;
  data: Record<string, any>;
  signature?: string;
  receivedAt: string;
}

export interface OAuthState {
  id: string;
  integrationId?: string;
  state: string;
  redirectUri: string;
  expiresAt: string;
}

export interface SyncHistory {
  id: string;
  tenantId: string;
  integrationId?: string;
  platform: string;
  status: string;
  data?: Record<string, any>;
  error?: string;
  syncedAt: string;
}

export interface IntegrationNotification {
  id: string;
  tenantId: string;
  integrationId?: string;
  platform: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'resolved';
  title: string;
  reason?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  integration?: Pick<Integration, 'id' | 'name' | 'provider' | 'lastSyncAt'>;
}

export interface OAuthStatus {
  isConnected: boolean;
  lastSync?: string;
  expiresAt?: string;
  canRefresh: boolean;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

// =============================================================================
// 🆕 NOTIFICATION (Sprint 4)
// =============================================================================
export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  metadata?: {
    actionUrl?: string;
    actionText?: string;
    icon?: string;
    alertType?: string;
    severity?: AlertSeverity;
  };
  isRead: boolean;
  readAt?: string;
  isDismissed: boolean;
  alertId?: string;
  campaignId?: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  expiresAt?: string;
}

