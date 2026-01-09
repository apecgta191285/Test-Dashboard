import { apiClient } from './api-client';
import { User, PaginatedResponse } from '@/types/api';

export const userService = {
    create: (data: Partial<User>) => apiClient.post<User>('/users', data),
    getAll: (query?: Record<string, any>) => apiClient.get<PaginatedResponse<User>>('/users', { params: query }),
    getOne: (id: string) => apiClient.get<User>(`/users/${id}`),
    update: (id: string, data: Partial<User>) => apiClient.put<User>(`/users/${id}`, data),
    delete: (id: string) => apiClient.delete<{ message: string }>(`/users/${id}`),
};
