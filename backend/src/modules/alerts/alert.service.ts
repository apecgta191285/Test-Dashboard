import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AlertRuleType, AlertSeverity, AlertStatus } from '@prisma/client';

// Preset Alert Rules - using Prisma enum types
const PRESET_RULES: Array<{
    name: string;
    type: AlertRuleType;
    metric: string;
    operator: string;
    threshold: number;
    severity: AlertSeverity;
    description: string;
}> = [
        {
            name: 'Low ROAS',
            type: AlertRuleType.PRESET,
            metric: 'roas',
            operator: 'lt',
            threshold: 1.0,
            severity: AlertSeverity.WARNING,
            description: 'ROAS ต่ำกว่า 1.0 - กำลังขาดทุน',
        },
        {
            name: 'Critical ROAS',
            type: AlertRuleType.PRESET,
            metric: 'roas',
            operator: 'lt',
            threshold: 0.5,
            severity: AlertSeverity.CRITICAL,
            description: 'ROAS ต่ำกว่า 0.5 - ขาดทุนหนัก',
        },
        {
            name: 'Overspend',
            type: AlertRuleType.PRESET,
            metric: 'spend',
            operator: 'gt',
            threshold: 1.1,
            severity: AlertSeverity.WARNING,
            description: 'ใช้งบเกิน 110% ของ budget',
        },
        {
            name: 'No Conversions',
            type: AlertRuleType.PRESET,
            metric: 'conversions',
            operator: 'eq',
            threshold: 0,
            severity: AlertSeverity.CRITICAL,
            description: 'ไม่มี Conversion ใน 7 วัน',
        },
        {
            name: 'CTR Drop',
            type: AlertRuleType.PRESET,
            metric: 'ctr',
            operator: 'lt',
            threshold: 0.7,
            severity: AlertSeverity.WARNING,
            description: 'CTR ลดลง 30% จากสัปดาห์ก่อน',
        },
        {
            name: 'Inactive Campaign',
            type: AlertRuleType.PRESET,
            metric: 'impressions',
            operator: 'eq',
            threshold: 0,
            severity: AlertSeverity.INFO,
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

    async getRules(tenantId: string) {
        return this.prisma.alertRule.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async initializePresetRules(tenantId: string) {
        const existingRules = await this.prisma.alertRule.findMany({
            where: { tenantId, type: AlertRuleType.PRESET },
        });

        if (existingRules.length > 0) {
            this.logger.log(`Preset rules already exist for tenant ${tenantId}`);
            return existingRules;
        }

        const createdRules = await Promise.all(
            PRESET_RULES.map((rule) =>
                this.prisma.alertRule.create({
                    data: {
                        tenant: { connect: { id: tenantId } },
                        name: rule.name,
                        type: rule.type,
                        metric: rule.metric,
                        operator: rule.operator,
                        threshold: rule.threshold,
                        severity: rule.severity,
                        description: rule.description,
                    },
                }),
            ),
        );

        this.logger.log(`Created ${createdRules.length} preset rules for tenant ${tenantId}`);
        return createdRules;
    }

    async createRule(tenantId: string, data: {
        name: string;
        metric: string;
        operator: string;
        threshold: number;
        severity?: AlertSeverity;
        description?: string;
    }) {
        return this.prisma.alertRule.create({
            data: {
                tenant: { connect: { id: tenantId } },
                name: data.name,
                metric: data.metric,
                operator: data.operator,
                threshold: data.threshold,
                type: AlertRuleType.CUSTOM,
                severity: data.severity || AlertSeverity.WARNING,
                description: data.description,
            },
        });
    }

    async updateRule(ruleId: string, tenantId: string, data: Prisma.AlertRuleUpdateInput) {
        return this.prisma.alertRule.update({
            where: { id: ruleId },
            data,
        });
    }

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

    async deleteRule(ruleId: string, tenantId: string) {
        const rule = await this.prisma.alertRule.findFirst({
            where: { id: ruleId, tenantId },
        });

        if (!rule) {
            throw new Error('Rule not found');
        }

        if (rule.type === AlertRuleType.PRESET) {
            throw new Error('Cannot delete preset rules, only disable them');
        }

        return this.prisma.alertRule.delete({
            where: { id: ruleId },
        });
    }

    // ============================================
    // Alert Management
    // ============================================

    async getAlerts(tenantId: string, options?: {
        status?: AlertStatus;
        severity?: AlertSeverity;
        limit?: number;
    }) {
        const { status, severity, limit = 50 } = options || {};

        const whereClause: Prisma.AlertWhereInput = { tenantId };
        if (status) whereClause.status = status;
        if (severity) whereClause.severity = severity;

        return this.prisma.alert.findMany({
            where: whereClause,
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

    async getOpenAlertsCount(tenantId: string) {
        const counts = await this.prisma.alert.groupBy({
            by: ['severity'],
            where: {
                tenantId,
                status: AlertStatus.OPEN,
            },
            _count: true,
        });

        return {
            total: counts.reduce((sum, c) => sum + c._count, 0),
            critical: counts.find((c) => c.severity === AlertSeverity.CRITICAL)?._count || 0,
            warning: counts.find((c) => c.severity === AlertSeverity.WARNING)?._count || 0,
            info: counts.find((c) => c.severity === AlertSeverity.INFO)?._count || 0,
        };
    }

    async acknowledgeAlert(alertId: string, tenantId: string) {
        return this.prisma.alert.update({
            where: { id: alertId },
            data: { status: AlertStatus.ACKNOWLEDGED },
        });
    }

    async resolveAlert(alertId: string, tenantId: string) {
        return this.prisma.alert.update({
            where: { id: alertId },
            data: {
                status: AlertStatus.RESOLVED,
                resolvedAt: new Date(),
            },
        });
    }

    async resolveAllAlerts(tenantId: string) {
        return this.prisma.alert.updateMany({
            where: {
                tenantId,
                status: { not: AlertStatus.RESOLVED },
            },
            data: {
                status: AlertStatus.RESOLVED,
                resolvedAt: new Date(),
            },
        });
    }

    // ============================================
    // Alert Checking (Batch / On-Demand)
    // ============================================

    async checkAlerts(tenantId: string) {
        this.logger.log(`Checking alerts for tenant ${tenantId}`);

        const rules = await this.prisma.alertRule.findMany({
            where: { tenantId, isActive: true },
        });

        if (rules.length === 0) {
            this.logger.log('No active rules found');
            return [];
        }

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

            const aggregated = this.aggregateMetrics(campaign.metrics);

            for (const rule of rules) {
                const violated = this.checkRule(rule, aggregated, campaign.budget);

                if (violated) {
                    const existingAlert = await this.prisma.alert.findFirst({
                        where: {
                            tenantId,
                            campaignId: campaign.id,
                            type: rule.name.toUpperCase().replace(/ /g, '_'),
                            status: { not: AlertStatus.RESOLVED },
                        },
                    });

                    if (!existingAlert) {
                        const alert = await this.prisma.alert.create({
                            data: {
                                tenant: { connect: { id: tenantId } },
                                rule: { connect: { id: rule.id } },
                                campaign: { connect: { id: campaign.id } },
                                type: rule.name.toUpperCase().replace(/ /g, '_'),
                                severity: rule.severity,
                                title: `${rule.name}: ${campaign.name}`,
                                message: this.generateAlertMessage(rule, aggregated, campaign.name),
                                metadata: {
                                    metric: rule.metric,
                                    value: aggregated[rule.metric],
                                    threshold: rule.threshold,
                                },
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

    private checkRule(rule: any, metrics: any, budget?: number | null) {
        const value = metrics[rule.metric];
        let threshold = rule.threshold;

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

    private generateAlertMessage(rule: any, metrics: any, campaignName: string) {
        const value = metrics[rule.metric];
        const formatted = typeof value === 'number' ? value.toFixed(2) : value;

        return `Campaign "${campaignName}" มี ${rule.metric} = ${formatted} (เกณฑ์: ${rule.operator} ${rule.threshold})`;
    }
}
