/**
 * Mock Campaigns Data
 * Campaign templates สำหรับทุก platform
 */

import { CampaignStatus, AdPlatform } from '@prisma/client';

export interface MockCampaign {
    externalId: string;
    name: string;
    status: CampaignStatus;
    budget: number;
    platform: AdPlatform;
}

/**
 * Google Ads Campaigns
 */
export const MOCK_GOOGLE_ADS_CAMPAIGNS: MockCampaign[] = [
    {
        externalId: 'gads-001',
        name: 'Google Search - Brand Keywords',
        status: CampaignStatus.ACTIVE,
        budget: 50000,
        platform: AdPlatform.GOOGLE_ADS,
    },
    {
        externalId: 'gads-002',
        name: 'Google Search - Generic Keywords',
        status: CampaignStatus.ACTIVE,
        budget: 80000,
        platform: AdPlatform.GOOGLE_ADS,
    },
    {
        externalId: 'gads-003',
        name: 'Display Remarketing',
        status: CampaignStatus.ACTIVE,
        budget: 30000,
        platform: AdPlatform.GOOGLE_ADS,
    },
    {
        externalId: 'gads-004',
        name: 'Google Shopping',
        status: CampaignStatus.PAUSED,
        budget: 45000,
        platform: AdPlatform.GOOGLE_ADS,
    },
];

/**
 * Facebook Campaigns
 */
export const MOCK_FACEBOOK_CAMPAIGNS: MockCampaign[] = [
    {
        externalId: 'fb-001',
        name: 'Facebook Lead Gen - Form',
        status: CampaignStatus.ACTIVE,
        budget: 35000,
        platform: AdPlatform.FACEBOOK,
    },
    {
        externalId: 'fb-002',
        name: 'Facebook Video Views',
        status: CampaignStatus.ACTIVE,
        budget: 25000,
        platform: AdPlatform.FACEBOOK,
    },
    {
        externalId: 'fb-003',
        name: 'Facebook Conversions - Website',
        status: CampaignStatus.PAUSED,
        budget: 60000,
        platform: AdPlatform.FACEBOOK,
    },
];

/**
 * TikTok Campaigns
 */
export const MOCK_TIKTOK_CAMPAIGNS: MockCampaign[] = [
    {
        externalId: 'tiktok-001',
        name: 'TikTok Awareness - Reach',
        status: CampaignStatus.ACTIVE,
        budget: 40000,
        platform: AdPlatform.TIKTOK,
    },
    {
        externalId: 'tiktok-002',
        name: 'TikTok Traffic - Website Visits',
        status: CampaignStatus.ACTIVE,
        budget: 55000,
        platform: AdPlatform.TIKTOK,
    },
];

/**
 * LINE Ads Campaigns
 */
export const MOCK_LINE_ADS_CAMPAIGNS: MockCampaign[] = [
    {
        externalId: 'line-001',
        name: 'LINE Ads - Brand Awareness',
        status: CampaignStatus.ACTIVE,
        budget: 50000,
        platform: AdPlatform.LINE_ADS,
    },
    {
        externalId: 'line-002',
        name: 'LINE Ads - Lead Generation',
        status: CampaignStatus.ACTIVE,
        budget: 75000,
        platform: AdPlatform.LINE_ADS,
    },
    {
        externalId: 'line-003',
        name: 'LINE Ads - Retargeting',
        status: CampaignStatus.PAUSED,
        budget: 30000,
        platform: AdPlatform.LINE_ADS,
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
