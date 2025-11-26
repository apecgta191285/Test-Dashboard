import { Injectable } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAdsClientService {
  private client: GoogleAdsApi;

  constructor(private configService: ConfigService) {
    this.client = new GoogleAdsApi({
      client_id: this.configService.get('GOOGLE_ADS_CLIENT_ID'),
      client_secret: this.configService.get('GOOGLE_ADS_CLIENT_SECRET'),
      developer_token: this.configService.get('GOOGLE_ADS_DEVELOPER_TOKEN'),
    });
  }

  /**
   * Get Google Ads Customer instance
   * @param customerId - Customer ID (e.g., "5892016442")
   * @param refreshToken - OAuth refresh token
   * @returns Customer instance for querying
   */
  getCustomer(customerId: string, refreshToken: string): Customer {
    const loginCustomerId = this.configService.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID');
    
    return this.client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken,
      login_customer_id: loginCustomerId, // 🔑 สำคัญมาก! MCC Manager ID
    });
  }
}
