import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
    DateRangeOption,
    DATE_RANGE_OPTIONS,
    DATE_RANGE_LABELS,
    getStartDateString,
    DEFAULT_DATE_RANGE,
} from '@/types/dateRange';

interface DateRangeContextType {
    dateRange: DateRangeOption;
    setDateRange: (range: DateRangeOption) => void;
    dateRangeLabel: string;
    startDateString: string;
    // ✅ Expose available options for components that need them
    availableOptions: readonly DateRangeOption[];
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
    const [dateRange, setDateRange] = useState<DateRangeOption>(DEFAULT_DATE_RANGE);

    const value: DateRangeContextType = {
        dateRange,
        setDateRange,
        dateRangeLabel: DATE_RANGE_LABELS[dateRange],
        startDateString: getStartDateString(dateRange),
        availableOptions: DATE_RANGE_OPTIONS,
    };

    return (
        <DateRangeContext.Provider value={value}>
            {children}
        </DateRangeContext.Provider>
    );
}

export function useDateRange() {
    const context = useContext(DateRangeContext);
    if (context === undefined) {
        throw new Error('useDateRange must be used within a DateRangeProvider');
    }
    return context;
}

// ✅ Re-export types for convenience
export type { DateRangeOption };
