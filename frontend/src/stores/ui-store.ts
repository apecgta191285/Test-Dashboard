// src/stores/ui-store.ts
import { create } from 'zustand';

interface DateRange {
    from: Date;
    to: Date;
}

interface UIState {
    // Sidebar
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;

    // Date Range
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;

    // Loading States
    globalLoading: boolean;
    setGlobalLoading: (loading: boolean) => void;
}

// Default: Last 30 days
const getDefaultDateRange = (): DateRange => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
};

export const useUIStore = create<UIState>((set) => ({
    // Sidebar
    sidebarOpen: true,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    // Date Range
    dateRange: getDefaultDateRange(),
    setDateRange: (range) => set({ dateRange: range }),

    // Loading
    globalLoading: false,
    setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
