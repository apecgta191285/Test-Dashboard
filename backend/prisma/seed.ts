import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant-001' },
    update: {},
    create: {
      id: 'demo-tenant-001',
      name: 'Demo Company',
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create client user
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@test.com' },
    update: {},
    create: {
      email: 'client@test.com',
      password: hashedPassword,
      name: 'Client User',
      role: 'CLIENT',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Created client user:', clientUser.email);

  // Create Google Ads Account
  console.log('📊 Creating Google Ads Account...');

  const googleAdsAccount = await prisma.googleAdsAccount.upsert({
    where: {
      tenantId_customerId: {
        tenantId: tenant.id,
        customerId: '1234567890',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      customerId: '1234567890',
      accountName: 'Demo Google Ads Account',
      accessToken: 'demo_access_token',
      refreshToken: 'demo_refresh_token',
      tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      lastSyncAt: new Date(),
    },
  });

  console.log('✅ Created Google Ads Account:', googleAdsAccount.accountName);

  // Create campaigns with Google Ads integration
  const campaigns = [
    {
      name: 'Summer Sale 2024 - Search',
      platform: 'GOOGLE_ADS',
      status: 'ACTIVE',
      budget: 8000,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-08-31'),
      externalId: 'google_camp_001',
      googleAdsAccountId: googleAdsAccount.id,
    },
    {
      name: 'Brand Awareness - Display',
      platform: 'GOOGLE_ADS',
      status: 'ACTIVE',
      budget: 5000,
      startDate: new Date('2024-10-01'),
      externalId: 'google_camp_002',
      googleAdsAccountId: googleAdsAccount.id,
    },
    {
      name: 'Product Launch - Shopping',
      platform: 'GOOGLE_ADS',
      status: 'ACTIVE',
      budget: 12000,
      startDate: new Date('2024-09-01'),
      externalId: 'google_camp_003',
      googleAdsAccountId: googleAdsAccount.id,
    },
    {
      name: 'Holiday Special - Video',
      platform: 'GOOGLE_ADS',
      status: 'PAUSED',
      budget: 3000,
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-12-31'),
      externalId: 'google_camp_004',
      googleAdsAccountId: googleAdsAccount.id,
    },
    {
      name: 'Retargeting Campaign - Display',
      platform: 'GOOGLE_ADS',
      status: 'ACTIVE',
      budget: 4500,
      startDate: new Date('2024-08-15'),
      externalId: 'google_camp_005',
      googleAdsAccountId: googleAdsAccount.id,
    },
    {
      name: 'Black Friday Sale - Search',
      platform: 'GOOGLE_ADS',
      status: 'ACTIVE',
      budget: 15000,
      startDate: new Date('2024-11-15'),
      endDate: new Date('2024-11-30'),
      externalId: 'google_camp_006',
      googleAdsAccountId: googleAdsAccount.id,
    },
    {
      name: 'New Year Promotion - Shopping',
      platform: 'GOOGLE_ADS',
      status: 'ACTIVE',
      budget: 10000,
      startDate: new Date('2024-12-20'),
      endDate: new Date('2025-01-10'),
      externalId: 'google_camp_007',
      googleAdsAccountId: googleAdsAccount.id,
    },
  ];

  console.log('📢 Creating campaigns...');

  const createdCampaigns = [];
  for (const campaignData of campaigns) {
    const campaign = await prisma.campaign.upsert({
      where: {
        tenantId_externalId: {
          tenantId: tenant.id,
          externalId: campaignData.externalId,
        },
      },
      update: campaignData,
      create: {
        ...campaignData,
        tenantId: tenant.id,
      },
    });
    createdCampaigns.push(campaign);
    console.log(`  ✅ ${campaign.name}`);
  }

  // Create metrics for last 30 days with realistic trends
  console.log('📊 Creating metrics for last 30 days...');

  const today = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const campaign of createdCampaigns) {
    let metricsCreated = 0;

    // Base metrics for each campaign (different for variety)
    const baseImpressions = Math.floor(Math.random() * 5000) + 10000; // 10k-15k
    const baseCTR = Math.random() * 0.03 + 0.02; // 2-5%
    const baseCPC = Math.random() * 2 + 0.5; // $0.5-$2.5
    const baseConversionRate = Math.random() * 0.08 + 0.03; // 3-11%
    const baseAOV = Math.random() * 100 + 80; // $80-$180 (Average Order Value)

    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);

      // Calculate day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeek = date.getDay();

      // Weekend multiplier (lower traffic on weekends)
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;

      // Trend multiplier (campaigns improve over time)
      const daysFromStart = Math.floor((date.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
      const trendMultiplier = 1 + (daysFromStart / 30) * 0.3; // 0-30% improvement over 30 days

      // Random daily variation (-20% to +20%)
      const randomVariation = 0.8 + Math.random() * 0.4;

      // Calculate metrics with variations
      const impressions = Math.floor(
        baseImpressions * weekendMultiplier * trendMultiplier * randomVariation
      );

      const ctr = baseCTR * (0.9 + Math.random() * 0.2); // ±10% variation
      const clicks = Math.floor(impressions * ctr);

      const cpc = baseCPC * (0.85 + Math.random() * 0.3); // ±15% variation
      const spend = clicks * cpc;

      const conversionRate = baseConversionRate * (0.8 + Math.random() * 0.4); // ±20% variation
      const conversions = Math.floor(clicks * conversionRate);

      const aov = baseAOV * (0.9 + Math.random() * 0.2); // ±10% variation
      const revenue = conversions * aov;

      const cpm = (spend / impressions) * 1000;
      const roas = spend > 0 ? revenue / spend : 0;

      try {
        await prisma.metric.create({
          data: {
            campaignId: campaign.id,
            date,
            impressions,
            clicks,
            spend,
            conversions,
            revenue,
            ctr: ctr * 100, // Convert to percentage
            cpc,
            cpm,
            roas,
          },
        });
        metricsCreated++;
      } catch (error) {
        // Skip if already exists
      }
    }

    console.log(`  ✅ ${campaign.name}: ${metricsCreated} metrics`);
  }

  console.log('✅ Seeding completed!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   Admin: admin@test.com / password123');
  console.log('   Client: client@test.com / password123');
  console.log('');
  console.log('📊 Created:');
  console.log(`   - ${createdCampaigns.length} campaigns`);
  console.log(`   - ~${createdCampaigns.length * 31} metrics (30 days)`);
  console.log('   - 1 Google Ads Account');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
