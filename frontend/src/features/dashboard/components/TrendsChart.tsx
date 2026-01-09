import { OverviewChart } from '@/components/OverviewChart';
import { TrendData } from '../types';
import { useDateRange } from '@/contexts/DateRangeContext';

interface TrendsChartProps {
    data: TrendData[];
    isLoading: boolean;
    // ✅ Removed dateRange and onDateRangeChange props - now using global context
}

export const TrendsChart = ({ data, isLoading }: TrendsChartProps) => {
    // ✅ Use global date range context
    const { dateRangeLabel } = useDateRange();

    return (
        <div className="space-y-4">


            <OverviewChart data={data} isLoading={isLoading} />
        </div>
    );
};
