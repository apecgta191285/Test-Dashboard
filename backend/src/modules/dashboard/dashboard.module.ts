import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from './metrics.service';
import { ExportService } from './export.service';
import { MockDataSeederService } from './mock-data-seeder.service';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService, MetricsService, ExportService, MockDataSeederService],
  // ✅ Export MockDataSeederService for use in GoogleAdsModule
  exports: [DashboardService, MetricsService, ExportService, MockDataSeederService],
})
export class DashboardModule { }
