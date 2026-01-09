/**
 * Alerts Generator
 * สร้าง mock alerts สำหรับทดสอบ Alert System
 */

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType =
    | 'LOW_ROAS'
    | 'CRITICAL_ROAS'
    | 'OVERSPEND'
    | 'NO_CONVERSIONS'
    | 'CTR_DROP'
    | 'INACTIVE_CAMPAIGN';

interface MockAlert {
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    campaignName: string;
    platform: string;
    value: number;
    threshold: number;
    isRead: boolean;
}

/**
 * Mock Alert Templates
 */
export const MOCK_ALERT_TEMPLATES: MockAlert[] = [
    {
        type: 'CRITICAL_ROAS',
        severity: 'CRITICAL',
        message: 'แคมเปญ {campaignName} มี ROAS วิกฤต ({value}) ต่ำกว่าเกณฑ์ ({threshold})',
        campaignName: 'Google Search - Brand Keywords',
        platform: 'GOOGLE_ADS',
        value: 0.3,
        threshold: 1.0,
        isRead: false,
    },
    {
        type: 'LOW_ROAS',
        severity: 'HIGH',
        message: 'แคมเปญ {campaignName} มี ROAS ต่ำ ({value}) ต่ำกว่าเกณฑ์ ({threshold})',
        campaignName: 'Facebook Lead Gen',
        platform: 'FACEBOOK',
        value: 0.8,
        threshold: 1.5,
        isRead: false,
    },
    {
        type: 'OVERSPEND',
        severity: 'HIGH',
        message: 'แคมเปญ {campaignName} ใช้งบเกิน {value}% ของงบที่ตั้งไว้',
        campaignName: 'TikTok Awareness',
        platform: 'TIKTOK',
        value: 125,
        threshold: 100,
        isRead: false,
    },
    {
        type: 'NO_CONVERSIONS',
        severity: 'MEDIUM',
        message: 'แคมเปญ {campaignName} ไม่มี conversion มา {value} วันแล้ว',
        campaignName: 'LINE Shopping Promo',
        platform: 'LINE_ADS',
        value: 7,
        threshold: 3,
        isRead: true,
    },
    {
        type: 'CTR_DROP',
        severity: 'MEDIUM',
        message: 'CTR ของ {campaignName} ลดลง {value}% จากสัปดาห์ก่อน',
        campaignName: 'Display Remarketing',
        platform: 'GOOGLE_ADS',
        value: 45,
        threshold: 20,
        isRead: false,
    },
    {
        type: 'INACTIVE_CAMPAIGN',
        severity: 'LOW',
        message: 'แคมเปญ {campaignName} ไม่มี activity มา {value} วัน',
        campaignName: 'FB Video Views',
        platform: 'FACEBOOK',
        value: 14,
        threshold: 7,
        isRead: true,
    },
    {
        type: 'LOW_ROAS',
        severity: 'HIGH',
        message: 'แคมเปญ {campaignName} มี ROAS ต่ำ ({value})',
        campaignName: 'Google Shopping',
        platform: 'GOOGLE_ADS',
        value: 0.9,
        threshold: 1.5,
        isRead: false,
    },
    {
        type: 'OVERSPEND',
        severity: 'CRITICAL',
        message: 'แคมเปญ {campaignName} ใช้งบเกิน {value}% - หยุดอัตโนมัติแล้ว',
        campaignName: 'Brand Awareness Campaign',
        platform: 'FACEBOOK',
        value: 150,
        threshold: 100,
        isRead: false,
    },
];

/**
 * สร้าง mock alerts สำหรับ tenant
 */
export function generateMockAlerts(count: number = 8): MockAlert[] {
    const alerts = [...MOCK_ALERT_TEMPLATES];

    // Shuffle and take first N
    return alerts
        .sort(() => Math.random() - 0.5)
        .slice(0, count)
        .map(alert => ({
            ...alert,
            message: alert.message
                .replace('{campaignName}', alert.campaignName)
                .replace('{value}', alert.value.toString())
                .replace('{threshold}', alert.threshold.toString()),
        }));
}

/**
 * สร้าง alert สำหรับบันทึกลง database
 */
export function generateAlertForDB(tenantId: string, ruleId: string, template: MockAlert) {
    const message = template.message
        .replace('{campaignName}', template.campaignName)
        .replace('{value}', template.value.toString())
        .replace('{threshold}', template.threshold.toString());

    return {
        tenantId,
        ruleId,
        type: template.type,
        severity: template.severity === 'LOW' ? 'INFO' : template.severity === 'MEDIUM' ? 'WARNING' : 'CRITICAL',
        title: `Mock Alert - ${template.type}`,
        message,
        metadata: JSON.stringify({
            campaignName: template.campaignName,
            platform: template.platform,
            value: template.value,
            threshold: template.threshold,
        }),
        status: template.isRead ? 'ACKNOWLEDGED' : 'OPEN',
    };
}
