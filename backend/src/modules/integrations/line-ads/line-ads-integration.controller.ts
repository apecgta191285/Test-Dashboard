import { Controller, Get, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('integrations/line-ads')
@Controller('integrations/line-ads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LineAdsIntegrationController {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    @Get('status')
    @ApiOperation({ summary: 'Check LINE Ads integration status' })
    async getStatus(@Req() req: any) {
        const tenantId = req.user.tenantId;
        const accounts = await this.prisma.lineAdsAccount.findMany({
            where: { tenantId },
            select: {
                id: true,
                channelId: true,
                channelName: true,
                status: true,
                lastSyncAt: true,
                createdAt: true,
            },
        });

        return {
            isConnected: accounts.length > 0,
            accounts: accounts,
        };
    }

    @Get('accounts')
    @ApiOperation({ summary: 'Get connected LINE Ads accounts' })
    async getConnectedAccounts(@Req() req: any) {
        const tenantId = req.user.tenantId;
        const accounts = await this.prisma.lineAdsAccount.findMany({
            where: { tenantId },
            select: {
                id: true,
                channelId: true,
                channelName: true,
                status: true,
                lastSyncAt: true,
                createdAt: true,
            },
        });

        return { accounts };
    }

    @Delete()
    @ApiOperation({ summary: 'Disconnect LINE Ads integration' })
    async disconnect(@Req() req: any) {
        const tenantId = req.user.tenantId;

        // Delete all LINE Ads accounts for this tenant
        await this.prisma.lineAdsAccount.deleteMany({
            where: { tenantId },
        });

        return {
            success: true,
            message: 'LINE Ads disconnected successfully',
        };
    }
}
