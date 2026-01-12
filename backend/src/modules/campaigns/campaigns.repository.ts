import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto, QueryCampaignsDto } from './dto';
import { Campaign, Metric, Prisma, CampaignStatus, AdPlatform } from '@prisma/client';

export abstract class CampaignsRepository {
  abstract create(tenantId: string, data: CreateCampaignDto): Promise<Campaign & { metrics: Metric[] }>;
  abstract findAll(tenantId: string, query: QueryCampaignsDto): Promise<[(Campaign & { metrics: Metric[] })[], number]>;
  abstract findOne(tenantId: string, id: string): Promise<(Campaign & { metrics: Metric[] }) | null>;
  abstract update(tenantId: string, id: string, data: any): Promise<Campaign & { metrics: Metric[] }>;
  abstract remove(tenantId: string, id: string): Promise<void>;
  abstract getMetrics(campaignId: string, startDate?: Date, endDate?: Date): Promise<Metric[]>;
}

@Injectable()
export class PrismaCampaignsRepository implements CampaignsRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(tenantId: string, dto: CreateCampaignDto): Promise<Campaign & { metrics: Metric[] }> {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        platform: dto.platform,
        status: dto.status || CampaignStatus.PENDING,
        budget: dto.budget,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        externalId: dto.externalId || null,
        tenantId,
      },
      include: { metrics: true },
    });
  }

  async findAll(tenantId: string, query: QueryCampaignsDto): Promise<[(Campaign & { metrics: Metric[] })[], number]> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search || undefined;
    const status = query.status || undefined;
    const platform = query.platform || undefined;

    const where: Prisma.CampaignWhereInput = { tenantId };

    if (search) {
      // Search only string fields, not enum fields
      where.OR = [
        { name: { contains: search } },
        { externalId: { contains: search } },
      ];
    }

    if (status) {
      // Cast string to CampaignStatus enum
      where.status = status as CampaignStatus;
    }

    if (platform) {
      // Cast string to AdPlatform enum
      where.platform = platform as AdPlatform;
    }

    const take = limit;
    const skip = (page - 1) * take;

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    return Promise.all([
      this.prisma.campaign.findMany({
        where,
        take,
        skip,
        include: { metrics: true },
        orderBy,
      }),
      this.prisma.campaign.count({ where }),
    ]);
  }

  async findOne(tenantId: string, id: string): Promise<(Campaign & { metrics: Metric[] }) | null> {
    return this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: { metrics: true },
    });
  }

  async update(tenantId: string, id: string, data: any): Promise<Campaign & { metrics: Metric[] }> {
    return this.prisma.campaign.update({
      where: { id },
      data,
      include: { metrics: true },
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.prisma.campaign.delete({
      where: { id },
    });
  }

  async getMetrics(campaignId: string, startDate?: Date, endDate?: Date): Promise<Metric[]> {
    const where: Prisma.MetricWhereInput = { campaignId };

    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    return this.prisma.metric.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }
}
