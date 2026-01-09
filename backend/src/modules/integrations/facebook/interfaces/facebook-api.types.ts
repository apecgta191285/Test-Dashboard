export interface FacebookCampaignResponse {
    id: string;
    name: string;
    status: string;
    objective: string;
    start_time?: string;
    stop_time?: string;
    daily_budget?: string;
    lifetime_budget?: string;
}

export interface FacebookInsightsResponse {
    date_start: string;
    date_stop: string;
    impressions: string;
    clicks: string;
    spend: string;
    conversions?: { action_type: string; value: string }[];
    purchase_roas?: { action_type: string; value: string }[];
    actions?: { action_type: string; value: string }[];
}

export interface FacebookAdAccountResponse {
    account_id: string;
    id: string;
    name: string;
    account_status: number;
}
