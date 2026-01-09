import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto, QueryCampaignsDto } from './dto';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  async create(@Request() req, @Body() createCampaignDto: CreateCampaignDto) {
    const tenantId = req.user.tenantId;
    return this.campaignsService.create(tenantId, createCampaignDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns with filtering and pagination' })
  async findAll(@Request() req, @Query() query: QueryCampaignsDto) {
    const tenantId = req.user.tenantId;
    return this.campaignsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.campaignsService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.campaignsService.update(tenantId, id, updateCampaignDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (soft delete) a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async remove(@Request() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.campaignsService.remove(tenantId, id);
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get campaign metrics' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async getMetrics(
    @Request() req,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user.tenantId;
    // ✅ Removed unused variables, pass strings directly
    return this.campaignsService.getCampaignMetrics(tenantId, id,
      startDate || undefined,
      endDate || undefined,
    );
  }
}

