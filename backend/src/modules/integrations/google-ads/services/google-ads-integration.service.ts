import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GoogleAdsOAuthService } from '../google-ads-oauth.service';
import { GoogleAdsClientService } from './google-ads-client.service';
import { ConnectGoogleAdsDto } from '../dto';

@Injectable()
export class GoogleAdsIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauthService: GoogleAdsOAuthService,
    private readonly clientService: GoogleAdsClientService,
  ) { }

  async connect(tenantId: string, dto: ConnectGoogleAdsDto) {
    // Save API connection
    const connection = await this.prisma.aPIConnection.create({
      data: {
        tenantId,
        platform: 'GOOGLE_ADS',
        credentials: JSON.stringify({
          clientId: dto.clientId,
          clientSecret: dto.clientSecret,
          developerToken: dto.developerToken,
          refreshToken: dto.refreshToken,
          customerId: dto.customerId,
        }),
        isActive: true,
      },
    });

    // Test connection
    let isValid = false;
    try {
      const customer = this.clientService.getCustomer(
        dto.customerId,
        dto.refreshToken,
      );
      // Simple query to verify access
      await customer.query('SELECT customer.id FROM customer LIMIT 1');
      isValid = true;
    } catch (error) {
      console.error('Connection test failed:', error);
      isValid = false;
    }

    if (!isValid) {
      await this.prisma.aPIConnection.update({
        where: { id: connection.id },
        data: { isActive: false },
      });
    }

    return {
      ...connection,
      connectionValid: isValid,
    };
  }

  async getAuthUrl(userId: string, tenantId: string) {
    return {
      authUrl: await this.oauthService.generateAuthUrl(userId, tenantId),
    };
  }
}

