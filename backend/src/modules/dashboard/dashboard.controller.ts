import { Controller, Get, Post, Delete, Query, UseGuards, Request, Res, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { MetricsService } from './metrics.service';
import { ExportService } from './export.service';
// ✅ Use TenantCacheInterceptor instead of default CacheInterceptor
import { TenantCacheInterceptor } from '../../common/interceptors/tenant-cache.interceptor';


@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantCacheInterceptor)  // ✅ Tenant-aware cache
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly metricsService: MetricsService,
    private readonly exportService: ExportService,
  ) { }

  @Get('metrics')
  async getMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('range') range: string,
    @Query('compare') compare: string,
  ) { }

  @Get('summary')
  async getSummary(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getSummary(req.user.tenantId, daysNum);
  }

  /**
   * Get summary metrics filtered by platform
   * @param platform - 'ALL' | 'GOOGLE_ADS' | 'FACEBOOK' | 'TIKTOK' | 'LINE_ADS'
   */
  @Get('summary-by-platform')
  async getSummaryByPlatform(
    @Request() req,
    @Query('days') days?: string,
    @Query('platform') platform?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const platformFilter = platform || 'ALL';
    return this.dashboardService.getSummaryByPlatform(req.user.tenantId, daysNum, platformFilter);
  }

  @Get('top-campaigns')
  async getTopCampaigns(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('days') days?: string,
  ) {
    // Robust parsing for limit - handle potential non-numeric strings
    let limitNum = 5;
    if (limit) {
      const parsed = parseInt(limit, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limitNum = parsed;
      }
    }

    const daysNum = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getTopCampaigns(req.user.tenantId, limitNum, daysNum);
  }

  @Get('trends')
  async getTrends(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getTrends(req.user.tenantId, daysNum);
  }

  @Get('performance-by-platform')
  async getPerformanceByPlatform(@Request() req, @Query('startDate') startDate?: string) {
    // Parse startDate (e.g., '7d', '30d') to days number
    let days = 30;
    if (startDate && startDate.endsWith('d')) {
      days = parseInt(startDate.replace('d', ''), 10);
    }
    return this.dashboardService.getPerformanceByPlatform(req.user.tenantId, days);
  }

  /**
   * Get metrics trends
   */
  @Get('metrics/trends')
  @UseGuards(JwtAuthGuard)
  async getMetricsTrends(
    @CurrentUser() user: any,
    @Query('period') period: string = '7d',  // ✅ Accept any period: 7d, 14d, 30d, 90d
    @Query('compare') compare?: 'previous_period',
  ) {
    return this.metricsService.getMetricsTrends(
      user.tenantId,
      period,
      compare,
    );
  }

  /**
   * Get daily metrics for charts
   */
  @Get('metrics/daily')
  @UseGuards(JwtAuthGuard)
  async getDailyMetrics(
    @CurrentUser() user: any,
    @Query('period') period: string = '7d',  // ✅ Accept any period: 7d, 14d, 30d, 90d
  ) {
    return this.metricsService.getDailyMetrics(user.tenantId, period);
  }

  /**
   * Export campaigns to CSV
   */
  @Get('export/campaigns/csv')
  @UseGuards(JwtAuthGuard)
  async exportCampaignsCSV(
    @CurrentUser() user: any,
    @Query('platform') platform?: string,
    @Query('status') status?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportService.exportCampaignsToCSV(user.tenantId, {
      platform,
      status,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=campaigns-${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send(csv);
  }

  /**
   * Export metrics to PDF
   */
  @Get('export/metrics/pdf')
  @UseGuards(JwtAuthGuard)
  async exportMetricsPDF(
    @CurrentUser() user: any,
    @Query('period') period: '7d' | '30d' = '7d',
    @Res() res?: Response,
  ) {
    const pdf = await this.exportService.exportMetricsToPDF(
      user.tenantId,
      period,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=metrics-${period}-${new Date().toISOString().split('T')[0]}.pdf`,
    );
    res.send(pdf);
  }
  /**
   * Get onboarding checklist status
   */
  @Get('onboarding-status')
  async getOnboardingStatus(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getOnboardingStatus(tenantId);
  }

  /**
   * DEV ONLY: Manually seed mock data
   */
  @Post('seed')
  async seedMockData(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.seedMockData(tenantId);
  }

  /**
   * DEV ONLY: Clear mock data
   */
  @Delete('seed')
  async clearMockData(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.clearMockData(tenantId);
  }
}
