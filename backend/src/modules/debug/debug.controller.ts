import { Controller, Delete, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebugService } from './debug.service';

@ApiTags('debug')
@Controller('debug')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DebugController {
    private readonly logger = new Logger(DebugController.name);

    constructor(private readonly debugService: DebugService) { }

    @Delete('mock-data')
    @ApiOperation({ summary: 'Clear all mock data (Admin only)' })
    async clearMockData() {
        return this.debugService.clearMockData();
    }
}
