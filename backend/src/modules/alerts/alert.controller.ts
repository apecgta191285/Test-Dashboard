import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertService } from './alert.service';
import { AlertSeverity, AlertStatus } from '@prisma/client';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertController {
    constructor(private readonly alertService: AlertService) { }

    // ============================================
    // Alert Rules Endpoints
    // ============================================

    @Get('rules')
    async getRules(@Request() req) {
        return this.alertService.getRules(req.user.tenantId);
    }

    @Post('rules/init')
    async initializePresetRules(@Request() req) {
        return this.alertService.initializePresetRules(req.user.tenantId);
    }

    @Post('rules')
    async createRule(
        @Request() req,
        @Body() body: {
            name: string;
            metric: string;
            operator: string;
            threshold: number;
            severity?: string;
            description?: string;
        },
    ) {
        // Cast severity string to enum if provided
        const data = {
            name: body.name,
            metric: body.metric,
            operator: body.operator,
            threshold: body.threshold,
            severity: body.severity ? (body.severity as AlertSeverity) : undefined,
            description: body.description,
        };
        return this.alertService.createRule(req.user.tenantId, data);
    }

    @Put('rules/:id')
    async updateRule(
        @Request() req,
        @Param('id') id: string,
        @Body() body: any,
    ) {
        return this.alertService.updateRule(id, req.user.tenantId, body);
    }

    @Put('rules/:id/toggle')
    async toggleRule(@Request() req, @Param('id') id: string) {
        return this.alertService.toggleRule(id, req.user.tenantId);
    }

    @Delete('rules/:id')
    async deleteRule(@Request() req, @Param('id') id: string) {
        return this.alertService.deleteRule(id, req.user.tenantId);
    }

    // ============================================
    // Alerts Endpoints
    // ============================================

    @Get()
    async getAlerts(
        @Request() req,
        @Query('status') status?: string,
        @Query('severity') severity?: string,
        @Query('limit') limit?: string,
    ) {
        // Cast string query params to enum types
        return this.alertService.getAlerts(req.user.tenantId, {
            status: status ? (status as AlertStatus) : undefined,
            severity: severity ? (severity as AlertSeverity) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
    }

    @Get('count')
    async getOpenAlertsCount(@Request() req) {
        return this.alertService.getOpenAlertsCount(req.user.tenantId);
    }

    @Post('check')
    async checkAlerts(@Request() req) {
        return this.alertService.checkAlerts(req.user.tenantId);
    }

    @Put(':id/acknowledge')
    async acknowledgeAlert(@Request() req, @Param('id') id: string) {
        return this.alertService.acknowledgeAlert(id, req.user.tenantId);
    }

    @Put(':id/resolve')
    async resolveAlert(@Request() req, @Param('id') id: string) {
        return this.alertService.resolveAlert(id, req.user.tenantId);
    }

    @Post('resolve-all')
    async resolveAllAlerts(@Request() req) {
        return this.alertService.resolveAllAlerts(req.user.tenantId);
    }
}
