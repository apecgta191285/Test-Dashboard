import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard-service';
import { Campaign, TrendData } from '../types';
import { toast } from 'sonner';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Platform } from '@/components/dashboard/PlatformTabs';

export const useDashboard = () => {
    // ✅ Use global DateRangeContext
    const { dateRange } = useDateRange();

    // ✅ Platform filter state
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ALL');

    // 1. Overview Data (Metrics & Trends) - filtered by platform
    const { data: overview, isLoading: isOverviewLoading, isFetching: isOverviewFetching, error: overviewError } = useQuery({
        queryKey: ['dashboard', 'overview', dateRange, selectedPlatform],
        queryFn: async () => {
            if (selectedPlatform === 'ALL') {
                // Use original endpoint for ALL platforms
                const response = await dashboardService.getMetricsTrends(dateRange, 'previous_period');
                return response.data;
            } else {
                // Use platform-specific endpoint
                const days = parseInt(dateRange.replace('d', ''));
                const response = await dashboardService.getSummaryByPlatform(days, selectedPlatform);
                return response.data;
            }
        },
        // ✅ Hybrid Approach: แสดง data เก่าระหว่าง fetch data ใหม่
        placeholderData: (previousData: any) => previousData,
    });

    // 2. Top Campaigns
    const { data: topCampaigns, isLoading: isCampaignsLoading } = useQuery({
        queryKey: ['dashboard', 'topCampaigns', dateRange],
        queryFn: async () => {
            const response = await dashboardService.getTopCampaigns(5, 'revenue', parseInt(dateRange));
            return Array.isArray(response.data) ? response.data : [];
        },
        placeholderData: (previousData: any) => previousData,
    });

    // 3. Trends Chart Data
    const { data: trendsData, isLoading: isTrendsLoading } = useQuery({
        queryKey: ['dashboard', 'trends', dateRange],
        queryFn: async () => {
            const response = await dashboardService.getDailyMetrics(dateRange);
            return response.data.data;
        },
        placeholderData: (previousData: any) => previousData,
    });

    const exportCSV = async () => {
        try {
            const response = await dashboardService.exportCampaignsCSV();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `campaigns-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (err) {
            console.error('Export CSV error:', err);
            toast.error('Failed to export CSV');
        }
    };

    const exportPDF = async () => {
        try {
            const response = await dashboardService.exportMetricsPDF(dateRange);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `metrics-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('PDF exported successfully');
        } catch (err) {
            console.error('Export PDF error:', err);
            toast.error('Failed to export PDF');
        }
    };

    return {
        overview,
        topCampaigns: topCampaigns || [],
        trendsData: trendsData || [],
        dateRange,
        selectedPlatform,
        setSelectedPlatform,
        isLoading: isOverviewLoading || isCampaignsLoading,
        isTrendsLoading,
        error: overviewError ? (overviewError as Error).message : '',
        exportCSV,
        exportPDF,
    };
};
