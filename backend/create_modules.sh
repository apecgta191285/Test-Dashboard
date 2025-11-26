#!/bin/bash

# Users Module
cat > src/modules/users/users.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
EOF

cat > src/modules/users/users.controller.ts << 'EOF'
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    // In real app, get tenantId from current user
    return { message: 'Users endpoint' };
  }
}
EOF

cat > src/modules/users/users.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
EOF

# Campaigns Module
cat > src/modules/campaigns/campaigns.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.campaign.findMany({
      where: { tenantId },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });
  }
}
EOF

cat > src/modules/campaigns/campaigns.controller.ts << 'EOF'
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CampaignsService } from './campaigns.service';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findAll() {
    return { message: 'Campaigns endpoint' };
  }
}
EOF

cat > src/modules/campaigns/campaigns.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
EOF

# Dashboard Module
cat > src/modules/dashboard/dashboard.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const campaignsCount = await this.prisma.campaign.count({
      where: { tenantId },
    });

    return {
      campaigns: campaignsCount,
      message: 'Dashboard overview',
    };
  }
}
EOF

cat > src/modules/dashboard/dashboard.controller.ts << 'EOF'
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview() {
    return { message: 'Dashboard overview endpoint' };
  }
}
EOF

cat > src/modules/dashboard/dashboard.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
EOF

echo "✅ All modules created"
