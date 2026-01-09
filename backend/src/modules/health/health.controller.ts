import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { HEALTH_CHECK } from '../../common/constants/app.constants';
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: PrismaHealthIndicator,
        private memory: MemoryHealthIndicator,
    ) { }

    /**
     * Full health check - checks database and memory
     */
    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.db.isHealthy('database'),
            () => this.memory.checkHeap('memory_heap', HEALTH_CHECK.MEMORY_THRESHOLD_BYTES),
        ]);
    }

    /**
     * Kubernetes liveness probe - lightweight check
     */
    @Get('liveness')
    liveness() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }

    /**
     * Kubernetes readiness probe - checks if app is ready to receive traffic
     */
    @Get('readiness')
    @HealthCheck()
    readiness() {
        return this.health.check([
            () => this.db.isHealthy('database'),
        ]);
    }
}
