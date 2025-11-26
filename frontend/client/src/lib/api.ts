import axios, { AxiosInstance } from 'axios';

// Get the backend URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string; companyName: string }) =>
    apiClient.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
};

// Users API
export const usersAPI = {
  create: (data: any) => apiClient.post('/users', data),
  getAll: (query?: any) => apiClient.get('/users', { params: query }),
  getOne: (id: string) => apiClient.get(`/users/${id}`),
  update: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
};

// Campaigns API
export const campaignsAPI = {
  create: (data: any) => apiClient.post('/campaigns', data),
  getAll: (query?: any) => apiClient.get('/campaigns', { params: query }),
  getOne: (id: string) => apiClient.get(`/campaigns/${id}`),
  update: (id: string, data: any) => apiClient.put(`/campaigns/${id}`, data),
  delete: (id: string) => apiClient.delete(`/campaigns/${id}`),
  getMetrics: (id: string, startDate?: string, endDate?: string) =>
    apiClient.get(`/campaigns/${id}/metrics`, { params: { startDate, endDate } }),
};

// Dashboard API
export const dashboardAPI = {
  getSummary: () => apiClient.get('/dashboard/summary'),
  getTrends: (days?: number) => apiClient.get('/dashboard/trends', { params: { days } }),
  getOverview: (startDate?: string, endDate?: string) =>
    apiClient.get('/dashboard/overview', { params: { startDate, endDate } }),
  getTopCampaigns: (limit?: number, sortBy?: string) =>
    apiClient.get('/dashboard/top-campaigns', { params: { limit, sortBy } }),
  getPerformanceByPlatform: (startDate?: string, endDate?: string) =>
    apiClient.get('/dashboard/performance-by-platform', { params: { startDate, endDate } }),
  getTimeSeries: (metric: string, startDate?: string, endDate?: string) =>
    apiClient.get('/dashboard/time-series', { params: { metric, startDate, endDate } }),
};

// Default export for convenience
export default apiClient;
