import { Controller, Get, Delete, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('TikTok Ads Integration')
@ApiBearerAuth()
@Controller('integrations/tiktok-ads')
@UseGuards(JwtAuthGuard)
export class TikTokAdsIntegrationController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('status')
    @ApiOperation({ summary: 'Check TikTok Ads integration status' })
    async getStatus(@Req() req: any) {
        const tenantId = req.user.tenantId;

        const accounts = await this.prisma.tikTokAdsAccount.findMany({
            where: { tenantId },
            select: {
                id: true,
                advertiserId: true,
                accountName: true,
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

    @Delete()
    @ApiOperation({ summary: 'Disconnect TikTok Ads integration' })
    async disconnect(@Req() req: any) {
        const tenantId = req.user.tenantId;

        // Delete all TikTok Ads accounts for this tenant
        await this.prisma.tikTokAdsAccount.deleteMany({
            where: { tenantId },
        });

        return {
            success: true,
            message: 'TikTok Ads disconnected successfully',
        };
    }
}
