import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GoogleAnalyticsService } from './google-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('integrations/google-analytics')
@Controller('integrations/google-analytics')
export class GoogleAnalyticsDataController {
    constructor(
        private readonly analyticsService: GoogleAnalyticsService,
    ) { }

    @Get('basic')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get basic GA4 metrics' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    async getBasicMetrics(
        @CurrentUser('tenantId') tenantId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.analyticsService.getBasicMetrics(tenantId, startDate, endDate);
    }
}
