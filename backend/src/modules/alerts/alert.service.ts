import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// Preset Alert Rules
const PRESET_RULES = [
    {
        name: 'Low ROAS',
        type: 'PRESET',
        metric: 'roas',
        operator: 'lt',
        threshold: 1.0,
        severity: 'WARNING',
        description: 'ROAS ต่ำกว่า 1.0 - กำลังขาดทุน',
    },
    {
        name: 'Critical ROAS',
        type: 'PRESET',
        metric: 'roas',
        operator: 'lt',
        threshold: 0.5,
        severity: 'CRITICAL',
        description: 'ROAS ต่ำกว่า 0.5 - ขาดทุนหนัก',
    },
    {
        name: 'Overspend',
        type: 'PRESET',
        metric: 'spend',
        operator: 'gt',
        threshold: 1.1, // Will multiply by budget
        severity: 'WARNING',
        description: 'ใช้งบเกิน 110% ของ budget',
    },
    {
        name: 'No Conversions',
        type: 'PRESET',
        metric: 'conversions',
        operator: 'eq',
        threshold: 0,
        severity: 'CRITICAL',
        description: 'ไม่มี Conversion ใน 7 วัน',
    },
    {
        name: 'CTR Drop',
        type: 'PRESET',
        metric: 'ctr',
        operator: 'lt',
        threshold: 0.7, // 70% of previous
        severity: 'WARNING',
        description: 'CTR ลดลง 30% จากสัปดาห์ก่อน',
    },
    {
        name: 'Inactive Campaign',
        type: 'PRESET',
        metric: 'impressions',
        operator: 'eq',
        threshold: 0,
        severity: 'INFO',
        description: 'ไม่มี Impressions ใน 3 วัน',
    },
];

@Injectable()
export class AlertService {
    private readonly logger = new Logger(AlertService.name);

    constructor(private prisma: PrismaService) { }

    // ============================================
    // Alert Rule Management
    // ============================================

    // Get all rules for tenant
    async getRules(tenantId: string) {
        return this.prisma.alertRule.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Create preset rules for new tenant
    async initializePresetRules(tenantId: string) {
        const existingRules = await this.prisma.alertRule.findMany({
            where: { tenantId, type: 'PRESET' },
        });

        if (existingRules.length > 0) {
            this.logger.log(`Preset rules already exist for tenant ${tenantId}`);
            return existingRules;
        }

        const createdRules = await Promise.all(
            PRESET_RULES.map((rule) =>
                this.prisma.alertRule.create({
                    data: {
                        ...rule,
                        tenantId,
                    },
                }),
            ),
        );

        this.logger.log(`Created ${createdRules.length} preset rules for tenant ${tenantId}`);
        return createdRules;
    }

    // Create custom rule
    async createRule(tenantId: string, data: {
        name: string;
        metric: string;
        operator: string;
        threshold: number;
        severity?: string;
        description?: string;
    }) {
        return this.prisma.alertRule.create({
            data: {
                ...data,
                type: 'CUSTOM',
                tenantId,
            },
        });
    }

    // Update rule
    async updateRule(ruleId: string, tenantId: string, data: Prisma.AlertRuleUpdateInput) {
        return this.prisma.alertRule.update({
            where: { id: ruleId },
            data,
        });
    }

    // Toggle rule active status
    async toggleRule(ruleId: string, tenantId: string) {
        const rule = await this.prisma.alertRule.findFirst({
            where: { id: ruleId, tenantId },
        });

        if (!rule) {
            throw new Error('Rule not found');
        }

        return this.prisma.alertRule.update({
            where: { id: ruleId },
            data: { isActive: !rule.isActive },
        });
    }

    // Delete rule (custom only)
    async deleteRule(ruleId: string, tenantId: string) {
        const rule = await this.prisma.alertRule.findFirst({
            where: { id: ruleId, tenantId },
        });

        if (!rule) {
            throw new Error('Rule not found');
        }

        if (rule.type === 'PRESET') {
            throw new Error('Cannot delete preset rules, only disable them');
        }

        return this.prisma.alertRule.delete({
            where: { id: ruleId },
        });
    }

    // ============================================
    // Alert Management
    // ============================================

    // Get alerts for tenant
    async getAlerts(tenantId: string, options?: {
        status?: string;
        severity?: string;
        limit?: number;
    }) {
        const { status, severity, limit = 50 } = options || {};

        return this.prisma.alert.findMany({
            where: {
                tenantId,
                ...(status && { status }),
                ...(severity && { severity }),
            },
            include: {
                campaign: {
                    select: { id: true, name: true, platform: true },
                },
                rule: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    // Get open alerts count
    async getOpenAlertsCount(tenantId: string) {
        const counts = await this.prisma.alert.groupBy({
            by: ['severity'],
            where: {
                tenantId,
                status: 'OPEN',
            },
            _count: true,
        });

        return {
            total: counts.reduce((sum, c) => sum + c._count, 0),
            critical: counts.find((c) => c.severity === 'CRITICAL')?._count || 0,
            warning: counts.find((c) => c.severity === 'WARNING')?._count || 0,
            info: counts.find((c) => c.severity === 'INFO')?._count || 0,
        };
    }

    // Acknowledge alert
    async acknowledgeAlert(alertId: string, tenantId: string) {
        return this.prisma.alert.update({
            where: { id: alertId },
            data: { status: 'ACKNOWLEDGED' },
        });
    }

    // Resolve alert
    async resolveAlert(alertId: string, tenantId: string) {
        return this.prisma.alert.update({
            where: { id: alertId },
            data: {
                status: 'RESOLVED',
                resolvedAt: new Date(),
            },
        });
    }

    // Resolve all alerts
    async resolveAllAlerts(tenantId: string) {
        return this.prisma.alert.updateMany({
            where: {
                tenantId,
                status: { not: 'RESOLVED' },
            },
            data: {
                status: 'RESOLVED',
                resolvedAt: new Date(),
            },
        });
    }

    // ============================================
    // Alert Checking (Batch / On-Demand)
    // ============================================

    // Check all alerts for tenant
    async checkAlerts(tenantId: string) {
        this.logger.log(`Checking alerts for tenant ${tenantId}`);

        // Get active rules
        const rules = await this.prisma.alertRule.findMany({
            where: { tenantId, isActive: true },
        });

        if (rules.length === 0) {
            this.logger.log('No active rules found');
            return [];
        }

        // Get recent metrics (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const campaigns = await this.prisma.campaign.findMany({
            where: { tenantId },
            include: {
                metrics: {
                    where: { date: { gte: sevenDaysAgo } },
                },
            },
        });

        const newAlerts: any[] = [];

        for (const campaign of campaigns) {
            if (campaign.metrics.length === 0) continue;

            // Aggregate metrics
            const aggregated = this.aggregateMetrics(campaign.metrics);

            for (const rule of rules) {
                const violated = this.checkRule(rule, aggregated, campaign.budget);

                if (violated) {
                    // Check if similar alert already exists and is open
                    const existingAlert = await this.prisma.alert.findFirst({
                        where: {
                            tenantId,
                            campaignId: campaign.id,
                            type: rule.name.toUpperCase().replace(/ /g, '_'),
                            status: { not: 'RESOLVED' },
                        },
                    });

                    if (!existingAlert) {
                        const alert = await this.prisma.alert.create({
                            data: {
                                tenantId,
                                ruleId: rule.id,
                                campaignId: campaign.id,
                                type: rule.name.toUpperCase().replace(/ /g, '_'),
                                severity: rule.severity,
                                title: `${rule.name}: ${campaign.name}`,
                                message: this.generateAlertMessage(rule, aggregated, campaign.name),
                                metadata: JSON.stringify({
                                    metric: rule.metric,
                                    value: aggregated[rule.metric],
                                    threshold: rule.threshold,
                                }),
                            },
                        });
                        newAlerts.push(alert);
                    }
                }
            }
        }

        this.logger.log(`Created ${newAlerts.length} new alerts`);
        return newAlerts;
    }

    // Helper: Aggregate metrics
    private aggregateMetrics(metrics: any[]) {
        const totals = metrics.reduce(
            (acc, m) => ({
                impressions: acc.impressions + m.impressions,
                clicks: acc.clicks + m.clicks,
                spend: acc.spend + m.spend,
                conversions: acc.conversions + m.conversions,
                revenue: acc.revenue + m.revenue,
            }),
            { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 },
        );

        return {
            ...totals,
            ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
            cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
            roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
        };
    }

    // Helper: Check if rule is violated
    private checkRule(rule: any, metrics: any, budget?: number | null) {
        const value = metrics[rule.metric];
        let threshold = rule.threshold;

        // Special handling for overspend
        if (rule.name === 'Overspend' && budget) {
            threshold = budget * rule.threshold;
        }

        switch (rule.operator) {
            case 'gt':
                return value > threshold;
            case 'lt':
                return value < threshold;
            case 'eq':
                return value === threshold;
            case 'gte':
                return value >= threshold;
            case 'lte':
                return value <= threshold;
            default:
                return false;
        }
    }

    // Helper: Generate alert message
    private generateAlertMessage(rule: any, metrics: any, campaignName: string) {
        const value = metrics[rule.metric];
        const formatted = typeof value === 'number' ? value.toFixed(2) : value;

        return `Campaign "${campaignName}" มี ${rule.metric} = ${formatted} (เกณฑ์: ${rule.operator} ${rule.threshold})`;
    }
}
