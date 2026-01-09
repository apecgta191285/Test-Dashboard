import { Controller, Post, Delete, UseGuards, Logger, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MockDataSeederService } from './mock-data-seeder.service';

/**
 * Dev Controller - Mock Data Management
 * 
 * ตาม SRP: แต่ละ endpoint มีหน้าที่เดียว (seed เฉพาะประเภทที่ระบุ)
 * ตาม DRY: ใช้ MockDataSeederService เป็น single source of truth
 */
@ApiTags('Dev Tools')
@ApiBearerAuth()
@Controller('dev')
@UseGuards(JwtAuthGuard)
export class DevController {
    private readonly logger = new Logger(DevController.name);

    constructor(private readonly mockSeeder: MockDataSeederService) { }

    // ============================================
    // Master Seeding (All-in-one)
    // ============================================

    @Post('seed-all')
    @ApiOperation({ summary: 'Seed ทั้งหมด (campaigns, metrics, alerts, sync logs)' })
    async seedAll(@CurrentUser() user: any) {
        this.logger.log(`[DEV] ${user.email} → seed-all`);
        return this.mockSeeder.seedAll(user.tenantId);
    }

    // ============================================
    // Category-specific Seeding
    // ============================================

    @Post('seed-campaigns')
    @ApiOperation({ summary: 'Seed campaigns (12 campaigns ทุก platform)' })
    async seedCampaigns(@CurrentUser() user: any) {
        this.logger.log(`[DEV] ${user.email} → seed-campaigns`);
        return this.mockSeeder.seedCampaigns(user.tenantId);
    }

    @Post('seed-metrics')
    @ApiOperation({ summary: 'Seed metrics สำหรับ campaigns ทั้งหมด (30 วัน)' })
    @ApiBody({ schema: { properties: { days: { type: 'number', default: 30 } } }, required: false })
    async seedMetrics(@CurrentUser() user: any, @Body('days') days?: number) {
        this.logger.log(`[DEV] ${user.email} → seed-metrics (${days || 30} days)`);
        return this.mockSeeder.seedAllCampaignMetrics(user.tenantId, days || 30);
    }

    @Post('seed-alerts')
    @ApiOperation({ summary: 'Seed alerts (8 alerts)' })
    async seedAlerts(@CurrentUser() user: any) {
        this.logger.log(`[DEV] ${user.email} → seed-alerts`);
        return this.mockSeeder.seedAlerts(user.tenantId, 8);
    }

    @Post('seed-sync-logs')
    @ApiOperation({ summary: 'Seed sync logs (12 logs)' })
    async seedSyncLogs(@CurrentUser() user: any) {
        this.logger.log(`[DEV] ${user.email} → seed-sync-logs`);
        return this.mockSeeder.seedSyncLogs(user.tenantId, 12);
    }

    // ============================================
    // Platform-specific Seeding
    // ============================================

    @Post('seed-platform/:platform')
    @ApiOperation({ summary: 'Seed campaigns สำหรับ platform เฉพาะ' })
    @ApiParam({ name: 'platform', enum: ['GOOGLE_ADS', 'FACEBOOK', 'TIKTOK', 'LINE_ADS'] })
    async seedByPlatform(
        @CurrentUser() user: any,
        @Param('platform') platform: string,
    ) {
        this.logger.log(`[DEV] ${user.email} → seed-platform/${platform}`);
        return this.mockSeeder.seedCampaigns(user.tenantId, [platform]);
    }

    // ============================================
    // Clear Mock Data
    // ============================================

    @Delete('clear-mock')
    @ApiOperation({ summary: 'ลบ mock data ทั้งหมด' })
    async clearMockData(@CurrentUser() user: any) {
        this.logger.log(`[DEV] ${user.email} → clear-mock`);
        return this.mockSeeder.clearMockData(user.tenantId);
    }

    @Delete('clear-campaigns')
    @ApiOperation({ summary: 'ลบเฉพาะ mock campaigns และ metrics' })
    async clearCampaigns(@CurrentUser() user: any) {
        this.logger.log(`[DEV] ${user.email} → clear-campaigns`);
        return this.mockSeeder.clearCampaignsAndMetrics(user.tenantId);
    }
}

