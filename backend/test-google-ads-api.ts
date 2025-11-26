import { PrismaClient } from '@prisma/client';
import { GoogleAdsApi } from 'google-ads-api';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testGoogleAdsAPI() {
  console.log('🧪 Testing Google Ads API Integration\n');

  // 1. ตรวจสอบ Environment Variables
  console.log('📋 Step 1: Checking Environment Variables...');
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:');
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error('\nPlease add them to .env file');
    return;
  }

  console.log('✅ All environment variables are set\n');

  // 2. ตรวจสอบ Google Ads Account ใน Database
  console.log('📋 Step 2: Checking Google Ads Account in Database...');
  const account = await prisma.googleAdsAccount.findFirst({
    where: { status: 'active' },
  });

  if (!account) {
    console.log('⚠️  No active Google Ads account found.');
    console.log('   Please connect Google Ads account first via Frontend or OAuth flow.\n');
    return;
  }

  console.log(`✅ Found account: ${account.customerName || account.customerId}`);
  console.log(`   Account ID: ${account.id}`);
  console.log(`   Customer ID: ${account.customerId}`);

  // Check if this is a demo/seed account
  if (account.customerId === '1234567890' || account.customerName === 'Demo Google Ads Account') {
    console.log('\n⚠️  WARNING: This is a DEMO account from seed data!');
    console.log('   This account cannot connect to real Google Ads API.');
    console.log('   To test with real Google Ads API:');
    console.log('   1. Go to Frontend: http://localhost:3001/integrations');
    console.log('   2. Click "Connect New Google Ads Account"');
    console.log('   3. Authorize with your real Google Ads account');
    console.log('   4. Run this test script again\n');
    return;
  }

  console.log('');

  // 3. ทดสอบ Google Ads API Connection
  console.log('📋 Step 3: Testing Google Ads API Connection...');

  try {
    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    // Create customer instance
    const customer = client.Customer({
      customer_id: account.customerId,
      refresh_token: account.refreshToken,
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
    });

    console.log('   Connecting to Google Ads API...');

    // Test query: Get account info
    const accountInfo = await customer.query(`
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer
      LIMIT 1
    `);

    if (accountInfo && accountInfo.length > 0) {
      const info = accountInfo[0];
      console.log('✅ Successfully connected to Google Ads API!');
      console.log(`   Account Name: ${info.customer.descriptive_name}`);
      console.log(`   Currency: ${info.customer.currency_code}`);
      console.log(`   Time Zone: ${info.customer.time_zone}\n`);
    }

    // 4. ทดสอบ Fetch Campaigns
    console.log('📋 Step 4: Testing Fetch Campaigns...');
    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.name
      LIMIT 10
    `);

    if (campaigns.length === 0) {
      console.log('⚠️  No campaigns found in Google Ads account.');
      console.log('   This is normal if you have a test account without campaigns.\n');
    } else {
      console.log(`✅ Found ${campaigns.length} campaign(s):`);
      campaigns.forEach((row: any) => {
        console.log(
          `   - ${row.campaign.name} (ID: ${row.campaign.id}, Status: ${row.campaign.status})`,
        );
      });
      console.log('');
    }

    // 5. ทดสอบ Fetch Metrics (ถ้ามี campaigns)
    if (campaigns.length > 0) {
      console.log('📋 Step 5: Testing Fetch Metrics...');
      const campaignId = campaigns[0].campaign.id;

      // Get metrics for last 7 days
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const metrics = await customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE 
          campaign.id = ${campaignId}
          AND segments.date >= '${startDateStr}'
          AND segments.date <= '${endDateStr}'
        ORDER BY segments.date ASC
        LIMIT 10
      `);

      if (metrics.length === 0) {
        console.log(
          `⚠️  No metrics found for campaign ${campaigns[0].campaign.name} in last 7 days.`,
        );
        console.log('   This is normal if the campaign has no activity.\n');
      } else {
        console.log(`✅ Found ${metrics.length} metric record(s):`);
        metrics.forEach((row: any) => {
          const cost = (row.metrics?.cost_micros || 0) / 1000000;
          const cpc = (row.metrics?.average_cpc || 0) / 1000000;
          console.log(
            `   ${row.segments.date}: ${row.metrics?.impressions || 0} impressions, ${row.metrics?.clicks || 0} clicks, $${cost.toFixed(2)} spend`,
          );
        });
        console.log('');
      }
    }

    console.log('✅ All tests completed successfully!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Test Metrics Sync Service via API endpoint');
    console.log('   2. Test Dashboard with real data');
    console.log('   3. Test Export functions');
  } catch (error: any) {
    console.error('❌ Error testing Google Ads API:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    
    if (error.details) {
      console.error(`   Details: ${JSON.stringify(error.details, null, 2)}`);
    }

    console.error('\n🔍 Common Issues:');
    console.error('   1. Developer Token not approved');
    console.error('   2. Invalid Customer ID format (must be 10 digits, no dashes)');
    console.error('   3. Token expired - need to reconnect');
    console.error('   4. No permission to access account');
    console.error('   5. Account has no campaigns');
    console.error('\n💡 Solution for "invalid_grant" error:');
    console.error('   - This usually means the token is expired or invalid');
    console.error('   - Delete the account from database and reconnect:');
    console.error('     1. Go to Frontend: http://localhost:3001/integrations');
    console.error('     2. Delete the old account (if possible)');
    console.error('     3. Click "Connect New Google Ads Account"');
    console.error('     4. Authorize with your Google Ads account again');
    console.error('   - Or delete from database manually:');
    console.error('     DELETE FROM GoogleAdsAccount WHERE id = \'' + account.id + '\';');
  }
}

testGoogleAdsAPI()
  .catch(console.error)
  .finally(() => prisma.$disconnect());