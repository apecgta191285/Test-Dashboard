import { apiClient } from './api-client';

export const authService = {
    register: (data: { email: string; password: string; name: string; companyName: string }) =>
        apiClient.post('/auth/register', data),
    login: (data: { email: string; password: string }) =>
        apiClient.post('/auth/login', data),
};
