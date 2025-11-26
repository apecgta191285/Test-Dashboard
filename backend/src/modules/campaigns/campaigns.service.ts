import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto, QueryCampaignsDto } from './dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) { }

  private safe(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private toDate(s?: string): Date | undefined {
    if (!s) return undefined;
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
  }

  async create(tenantId: string, dto: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        platform: dto.platform,
        status: dto.status || 'DRAFT',
        budget: dto.budget,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        externalId: dto.externalId || null,
        tenantId,
      },
      include: { metrics: true },
    });

    return this.normalizeCampaign(campaign);
  }

  async findAll(tenantId: string, query: QueryCampaignsDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search || undefined;
    const status = query.status || undefined;
    const platform = query.platform || undefined;

    const where: any = { tenantId };

    if (search) {
      // SQLite doesn't support mode: 'insensitive'
      where.OR = [
        { name: { contains: search } },
        { platform: { contains: search } },
        { externalId: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (platform) {
      where.platform = platform;
    }

    const take = limit;
    const skip = (page - 1) * take;

    // Build orderBy
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        take,
        skip,
        include: { metrics: true },
        orderBy,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    const normalized = items.map((c) => this.normalizeCampaign(c));

    return {
      data: normalized,
      meta: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: { metrics: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return this.normalizeCampaign(campaign);
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto) {
    // Check if campaign exists
    await this.findOne(tenantId, id);

    const data: any = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.platform !== undefined) {
      data.platform = dto.platform;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.budget !== undefined) {
      data.budget = dto.budget;
    }

    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }

    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data,
      include: { metrics: true },
    });

    return this.normalizeCampaign(campaign);
  }

  async remove(tenantId: string, id: string) {
    // Check if campaign exists
    await this.findOne(tenantId, id);

    // Delete campaign (cascade will delete metrics)
    await this.prisma.campaign.delete({
      where: { id },
    });

    return { message: 'Campaign deleted successfully' };
  }

  async getCampaignMetrics(
    tenantId: string,
    id: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Check if campaign exists
    const campaign = await this.findOne(tenantId, id);

    const where: any = { campaignId: id };

    const start = this.toDate(startDate);
    const end = this.toDate(endDate);

    if (start || end) {
      where.date = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    const metrics = await this.prisma.metric.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
      },
      metrics: metrics.map((m) => ({
        date: m.date,
        impressions: m.impressions,
        clicks: m.clicks,
        spend: this.safe(m.spend),
        conversions: m.conversions,
        revenue: this.safe(m.revenue),
        ctr: this.safe(m.ctr),
        cpc: this.safe(m.cpc),
        cpm: this.safe(m.cpm),
        roas: this.safe(m.roas),
      })),
    };
  }

  private normalizeCampaign(c: any) {
    const m = c.metrics || [];
    const spend = m.reduce((s: number, x: any) => s + this.safe(x.spend), 0);
    const revenue = m.reduce((s: number, x: any) => s + this.safe(x.revenue), 0);
    const clicks = m.reduce((s: number, x: any) => s + this.safe(x.clicks), 0);
    const impressions = m.reduce((s: number, x: any) => s + this.safe(x.impressions), 0);
    const conversions = m.reduce((s: number, x: any) => s + this.safe(x.conversions), 0);

    return {
      id: c.id,
      name: c.name,
      platform: c.platform,
      status: c.status,
      budget: this.safe(c.budget),
      startDate: c.startDate,
      endDate: c.endDate,
      externalId: c.externalId,
      spend,
      revenue,
      clicks,
      impressions,
      conversions,
      roas: spend ? Number((revenue / spend).toFixed(2)) : 0,
      ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
