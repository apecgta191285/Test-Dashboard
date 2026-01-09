import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignsRepository, PrismaCampaignsRepository } from './campaigns.repository';

@Module({
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    {
      provide: CampaignsRepository,
      useClass: PrismaCampaignsRepository,
    },
  ],
})
export class CampaignsModule { }

