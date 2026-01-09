import { apiClient } from './api-client';
import { Campaign, PaginatedResponse, Metric } from '@/types/api';

export const campaignService = {
    create: (data: Partial<Campaign>) => apiClient.post<Campaign>('/campaigns', data),
    getAll: (query?: Record<string, any>) => apiClient.get<PaginatedResponse<Campaign>>('/campaigns', { params: query }),
    getOne: (id: string) => apiClient.get<Campaign>(`/campaigns/${id}`),
    update: (id: string, data: Partial<Campaign>) => apiClient.put<Campaign>(`/campaigns/${id}`, data),
    delete: (id: string) => apiClient.delete<{ message: string }>(`/campaigns/${id}`),
    getMetrics: (id: string, startDate?: string, endDate?: string) =>
        apiClient.get<{ campaign: Partial<Campaign>; metrics: Metric[] }>(`/campaigns/${id}/metrics`, { params: { startDate, endDate } }),
};
