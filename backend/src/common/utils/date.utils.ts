/**
 * Date Utility Functions
 * ฟังก์ชันช่วยจัดการวันที่
 */

/**
 * แปลงจำนวนวันเป็น milliseconds
 * @param days จำนวนวัน
 * @returns milliseconds
 */
export function daysToMs(days: number): number {
    return days * 24 * 60 * 60 * 1000;
}

/**
 * ดึงวันที่ย้อนหลัง X วัน
 * @param days จำนวนวันย้อนหลัง
 * @returns Date object
 */
export function getDateDaysAgo(days: number): Date {
    return new Date(Date.now() - daysToMs(days));
}

/**
 * Format date เป็น YYYY-MM-DD
 * @param date Date object หรือ string
 * @returns string ในรูปแบบ YYYY-MM-DD
 */
export function formatDateYMD(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
}

/**
 * ดึง start และ end date จาก period string
 * @param period เช่น '7d', '14d', '30d', '90d'
 * @returns { startDate, endDate }
 */
export function getDateRangeFromPeriod(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const daysMatch = period.match(/^(\d+)d$/);
    const days = daysMatch ? parseInt(daysMatch[1], 10) : 30;
    const startDate = getDateDaysAgo(days);

    return { startDate, endDate };
}
