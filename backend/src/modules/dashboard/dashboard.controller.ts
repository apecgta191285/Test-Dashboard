import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get('summary')
  async getSummary(@Request() req) {
    return this.dashboardService.getSummary(req.user.tenantId);
  }

  @Get('top-campaigns')
  async getTopCampaigns(@Request() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.dashboardService.getTopCampaigns(req.user.tenantId, limitNum);
  }

  @Get('trends')
  async getTrends(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getTrends(req.user.tenantId, daysNum);
  }
}
