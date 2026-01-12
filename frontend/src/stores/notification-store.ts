// src/stores/notification-store.ts
import { create } from 'zustand';
import type { Notification } from '@/types/api';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;
    isLoading: boolean;

    // Actions
    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    dismiss: (id: string) => void;
    setOpen: (open: boolean) => void;
    setLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    isOpen: false,
    isLoading: false,

    setNotifications: (notifications) =>
        set({
            notifications,
            unreadCount: notifications.filter((n) => !n.isRead).length,
        }),

    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
        })),

    markAsRead: (id) =>
        set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            if (!notification || notification.isRead) return state;

            return {
                notifications: state.notifications.map((n) =>
                    n.id === id
                        ? { ...n, isRead: true, readAt: new Date().toISOString() }
                        : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            };
        }),

    markAllAsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({
                ...n,
                isRead: true,
                readAt: n.readAt || new Date().toISOString(),
            })),
            unreadCount: 0,
        })),

    dismiss: (id) =>
        set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            const wasUnread = notification && !notification.isRead;
            return {
                notifications: state.notifications.filter((n) => n.id !== id),
                unreadCount: wasUnread
                    ? Math.max(0, state.unreadCount - 1)
                    : state.unreadCount,
            };
        }),

    setOpen: (open) => set({ isOpen: open }),
    setLoading: (loading) => set({ isLoading: loading }),
}));
