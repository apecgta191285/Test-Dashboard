/**
 * Mock Campaigns Data
 * Campaign templates สำหรับทุก platform
 */

export interface MockCampaign {
    externalId: string;
    name: string;
    status: 'ENABLED' | 'PAUSED' | 'REMOVED';
    budget: number;
    platform: string;
}

/**
 * Google Ads Campaigns
 */
export const MOCK_GOOGLE_ADS_CAMPAIGNS: MockCampaign[] = [
    {
        externalId: 'gads-001',
        name: 'Google Search - Brand Keywords',
        status: 'ENABLED',
        budget: 50000,
        platform: 'GOOGLE_ADS',
    },
    {
        externalId: 'gads-002',
        name: 'Google Search - Generic Keywords',
        status: 'ENABLED',
        budget: 80000,
        platform: 'GOOGLE_ADS',
    },
    {
        externalId: 'gads-003',
        name: 'Display Remarketing',
        status: 'ENABLED',
        budget: 30000,
        platform: 'GOOGLE_ADS',
    },
    {
        externalId: 'gads-004',
        name: 'Google Shopping',
        status: 'PAUSED',
        budget: 45000,
        platform: 'GOOGLE_ADS',
    },
];

/**
 * Facebook Campaigns
 */
export const MOCK_FACEBOOK_CAMPAIGNS: MockCampaign[] = [
    {
        externalId: 'fb-001',
        name: 'Facebook Lead Gen - Form',
        status: 'ENABLED',
        budget: 35000,
        platform: 'FACEBOOK',
    },
    {
        externalId: 'fb-002',
        name: 'Facebook Video Views',
        status: 'ENABLED',
        budget: 25000,
        platform: 'FACEBOOK',
    },
    {
        externalId: 'fb-003',
        name: 'Facebook Conversions - Website',
        status: 'PAUSED',
        budget: 60000,
        platform: 'FACEBOOK',
    },
];

/**
 * TikTok Campaigns
 */
export const MOCK_TIKTOK_CAMPAIGNS: MockCampaign[] = [
    {
        externalId: 'tiktok-001',
        name: 'TikTok Awareness - Reach',
        status: 'ENABLED',
        budget: 40000,
        platform: 'TIKTOK',
    },
    {
        externalId: 'tiktok-002',
        name: 'TikTok Traffic - Website Visits',
        status: 'ENABLED',
        budget: 55000,
        platform: 'TIKTOK',
    },
];

/**
 * LINE Ads Campaigns
 */
export const MOCK_LINE_ADS_CAMPAIGNS: MockCampaign[] = [
    {
        externalId: 'line-001',
        name: 'LINE Ads - Brand Awareness',
        status: 'ENABLED',
        budget: 50000,
        platform: 'LINE_ADS',
    },
    {
        externalId: 'line-002',
        name: 'LINE Ads - Lead Generation',
        status: 'ENABLED',
        budget: 75000,
        platform: 'LINE_ADS',
    },
    {
        externalId: 'line-003',
        name: 'LINE Ads - Retargeting',
        status: 'PAUSED',
        budget: 30000,
        platform: 'LINE_ADS',
    },
];

/**
 * รวม campaigns ทั้งหมด
 */
export const ALL_MOCK_CAMPAIGNS: MockCampaign[] = [
    ...MOCK_GOOGLE_ADS_CAMPAIGNS,
    ...MOCK_FACEBOOK_CAMPAIGNS,
    ...MOCK_TIKTOK_CAMPAIGNS,
    ...MOCK_LINE_ADS_CAMPAIGNS,
];

/**
 * ดึง campaigns ตาม platform
 */
export function getMockCampaignsByPlatform(platform: string): MockCampaign[] {
    switch (platform) {
        case 'GOOGLE_ADS':
            return MOCK_GOOGLE_ADS_CAMPAIGNS;
        case 'FACEBOOK':
            return MOCK_FACEBOOK_CAMPAIGNS;
        case 'TIKTOK':
            return MOCK_TIKTOK_CAMPAIGNS;
        case 'LINE_ADS':
            return MOCK_LINE_ADS_CAMPAIGNS;
        default:
            return [];
    }
}
