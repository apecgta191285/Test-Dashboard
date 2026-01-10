// prisma/seed.ts (Fixed: Removed emailVerified to match Schema)
import { PrismaClient, UserRole, CampaignStatus, NotificationType, NotificationChannel, NotificationStatus, AdPlatform, AlertSeverity, SyncStatus, AlertStatus, AlertRuleType, SyncType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed (Sprint 4 Strict Mode)...');

  // 1. Clean up old data
  try {
    await prisma.notification.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.alertRule.deleteMany();
    await prisma.syncLog.deleteMany();
    await prisma.metric.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.googleAdsAccount.deleteMany();
    await prisma.facebookAdsAccount.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
  } catch (e) {
    console.log('⚠️ Cleanup warning:', e);
  }

  // 2. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      id: 'demo-tenant-001',
      name: 'RGA Demo Company',
      settings: { theme: 'light', currency: 'THB' },
    },
  });

  // 3. Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@rga.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: UserRole.ADMIN,
      tenantId: tenant.id,
      lastLoginAt: new Date(),
      // ❌ ลบ emailVerified ออกแล้ว เพื่อให้ตรงกับ Schema
    },
  });

  const client = await prisma.user.create({
    data: {
      email: 'client@customer.com',
      password: hashedPassword,
      name: 'Khun Somchai',
      role: UserRole.CLIENT,
      tenantId: tenant.id,
    },
  });

  // 4. Create Google Ads Account
  const googleAccount = await prisma.googleAdsAccount.create({
    data: {
      tenantId: tenant.id,
      customerId: '123-456-7890',
      accountName: 'RGA Main Account',
      accessToken: 'mock_token',
      refreshToken: 'mock_refresh',
    }
  });

  // 5. Create Campaign
  const campaign = await prisma.campaign.create({
    data: {
      tenantId: tenant.id,
      name: 'Summer Sale 2026',
      platform: AdPlatform.GOOGLE_ADS,
      externalId: 'cmp_123456',
      status: CampaignStatus.ACTIVE,
      syncStatus: SyncStatus.SUCCESS,
      budget: 50000,
      googleAdsAccountId: googleAccount.id,
      startDate: new Date(),
    },
  });

  // 6. Create Alert Rule
  const rule = await prisma.alertRule.create({
    data: {
      tenantId: tenant.id,
      name: 'Budget Over 80%',
      type: AlertRuleType.PRESET,
      metric: 'spend',
      operator: 'gt',
      threshold: 80,
      severity: AlertSeverity.WARNING,
    }
  });

  // 7. Create Alert & Notification
  const alert = await prisma.alert.create({
    data: {
      tenantId: tenant.id,
      ruleId: rule.id,
      campaignId: campaign.id,
      type: 'BUDGET_WARNING',
      severity: AlertSeverity.WARNING,
      status: AlertStatus.OPEN,
      title: 'Budget Warning',
      message: 'Campaign used 80% of budget',
      metadata: { threshold: 80, current: 85 },
    }
  });

  await prisma.notification.create({
    data: {
      tenantId: tenant.id,
      userId: client.id,
      alertId: alert.id,
      type: 'ALERT',
      channel: NotificationChannel.IN_APP,
      title: 'Budget Alert',
      message: 'Your campaign is running out of budget.',
      metadata: { campaignId: campaign.id, action: 'VIEW_CAMPAIGN' },
    },
  });

  console.log('✅ Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });