/**
 * Centralized DateRange Types
 * 
 * Single source of truth for all date range related types.
 * Used by: DateRangeContext, Dashboard APIs, Analytics APIs
 * 
 * @example
 * // Adding a new option in the future:
 * // 1. Add to DATE_RANGE_OPTIONS
 * // 2. Add label to DATE_RANGE_LABELS
 * // 3. Done! All components will automatically support it.
 */

// ✅ Single source of truth for date range options
// Sprint 2: Only 7d and 30d as per specification
export const DATE_RANGE_OPTIONS = ['7d', '30d'] as const;

// ✅ Type derived from the constant (DRY principle)
export type DateRangeOption = typeof DATE_RANGE_OPTIONS[number];

// ✅ Human-readable labels for UI
export const DATE_RANGE_LABELS: Record<DateRangeOption, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
};

// ✅ For API calls that need "XdaysAgo" format
export const getStartDateString = (option: DateRangeOption): string => {
    const days = parseInt(option.replace('d', ''));
    return `${days}daysAgo`;
};

// ✅ Get number of days from option
export const getDaysFromOption = (option: DateRangeOption): number => {
    return parseInt(option.replace('d', ''));
};

// ✅ Default option
export const DEFAULT_DATE_RANGE: DateRangeOption = '7d';

// ✅ Type guard for validation
export const isValidDateRange = (value: string): value is DateRangeOption => {
    return DATE_RANGE_OPTIONS.includes(value as DateRangeOption);
};
