export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  refreshToken?: string;
  customerId?: string;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  budget: number;
  startDate: string;
  endDate?: string;
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
}

