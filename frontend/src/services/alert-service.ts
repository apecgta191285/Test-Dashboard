import { apiClient } from './api-client';

// Types
export interface AlertRule {
    id: string;
    tenantId: string;
    name: string;
    type: 'PRESET' | 'CUSTOM';
    metric: string;
    operator: string;
    threshold: number;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    isActive: boolean;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Alert {
    id: string;
    tenantId: string;
    ruleId?: string;
    campaignId?: string;
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    title: string;
    message: string;
    metadata?: string;
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
    createdAt: string;
    resolvedAt?: string;
    campaign?: {
        id: string;
        name: string;
        platform: string;
    };
    rule?: {
        id: string;
        name: string;
    };
}

export interface AlertCount {
    total: number;
    critical: number;
    warning: number;
    info: number;
}

// Alert Service
export const alertService = {
    // Rules
    getRules: () => apiClient.get<AlertRule[]>('/alerts/rules'),

    initializePresetRules: () => apiClient.post<AlertRule[]>('/alerts/rules/init'),

    createRule: (data: {
        name: string;
        metric: string;
        operator: string;
        threshold: number;
        severity?: string;
        description?: string;
    }) => apiClient.post<AlertRule>('/alerts/rules', data),

    updateRule: (id: string, data: Partial<AlertRule>) =>
        apiClient.put<AlertRule>(`/alerts/rules/${id}`, data),

    toggleRule: (id: string) =>
        apiClient.put<AlertRule>(`/alerts/rules/${id}/toggle`),

    deleteRule: (id: string) =>
        apiClient.delete(`/alerts/rules/${id}`),

    // Alerts
    getAlerts: (params?: { status?: string; severity?: string; limit?: number }) =>
        apiClient.get<Alert[]>('/alerts', { params }),

    getOpenAlertsCount: () =>
        apiClient.get<AlertCount>('/alerts/count'),

    checkAlerts: () =>
        apiClient.post<Alert[]>('/alerts/check'),

    acknowledgeAlert: (id: string) =>
        apiClient.put<Alert>(`/alerts/${id}/acknowledge`),

    resolveAlert: (id: string) =>
        apiClient.put<Alert>(`/alerts/${id}/resolve`),

    resolveAllAlerts: () =>
        apiClient.post('/alerts/resolve-all'),
};
