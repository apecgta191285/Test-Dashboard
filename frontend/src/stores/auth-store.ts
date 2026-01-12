// src/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api';
import { apiClient } from '@/services/api-client';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
    setUser: (user: User | null) => void;
    clearError: () => void;
    checkAuth: () => void;
}

interface RegisterData {
    email: string;
    password: string;
    name: string;
    companyName: string;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await apiClient.post('/auth/login', {
                        email,
                        password,
                    });
                    const { accessToken, refreshToken, user } = response.data.data;

                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);

                    set({ user, isAuthenticated: true, isLoading: false });
                } catch (error: any) {
                    const message = error.response?.data?.message || 'Login failed';

                    // Handle account locked error
                    if (error.response?.data?.error === 'ACCOUNT_LOCKED') {
                        set({
                            error: 'Account is locked. Please try again later or contact support.',
                            isLoading: false,
                        });
                    } else {
                        set({ error: message, isLoading: false });
                    }
                    throw error;
                }
            },

            register: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await apiClient.post('/auth/register', data);
                    const { accessToken, refreshToken, user } = response.data.data;

                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);

                    set({ user, isAuthenticated: true, isLoading: false });
                } catch (error: any) {
                    const message = error.response?.data?.message || 'Registration failed';
                    set({ error: message, isLoading: false });
                    throw error;
                }
            },

            logout: () => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                set({ user: null, isAuthenticated: false, error: null });
            },

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            clearError: () => set({ error: null }),

            checkAuth: () => {
                const token = localStorage.getItem('accessToken');
                const userStr = localStorage.getItem('user');

                if (token && userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        set({ user, isAuthenticated: true });
                    } catch {
                        set({ user: null, isAuthenticated: false });
                    }
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
