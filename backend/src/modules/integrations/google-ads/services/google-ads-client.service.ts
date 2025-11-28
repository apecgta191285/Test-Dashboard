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

  /**
   * List accessible customers for a given refresh token
   * @param refreshToken - OAuth refresh token
   * @returns List of resource names (e.g., "customers/1234567890")
   */
  async listAccessibleCustomers(refreshToken: string): Promise<string[]> {
    return (this.client as any).listAccessibleCustomers(refreshToken);
  }

  /**
   * Get all client accounts under the manager account
   * @param refreshToken - OAuth refresh token
   * @returns Array of client accounts with id, name, and status
   */
  async getClientAccounts(refreshToken: string) {
    const loginCustomerId = this.configService.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID');

    if (!loginCustomerId) {
      throw new Error('GOOGLE_ADS_LOGIN_CUSTOMER_ID not configured');
    }

    console.log(`Using Manager Account ID: ${loginCustomerId} to list client accounts`);

    // Use Manager Account to list client accounts
    const customer = this.client.Customer({
      customer_id: loginCustomerId, // Manager Account (e.g., "2626383041")
      refresh_token: refreshToken,
      login_customer_id: loginCustomerId,
    });

    const query = `
      SELECT
        customer_client.id,
        customer_client.descriptive_name,
        customer_client.manager,
        customer_client.status
      FROM customer_client
      WHERE customer_client.manager = FALSE
    `;

    try {
      const results = await customer.query(query);

      console.log(`Found ${results.length} client accounts`);

      const statusMap: Record<number, string> = {
        0: 'UNSPECIFIED',
        1: 'UNKNOWN',
        2: 'ENABLED',
        3: 'CANCELED',
        4: 'SUSPENDED',
        5: 'CLOSED',
      };

      return results.map((row: any) => ({
        id: row.customer_client.id.toString(),
        name: row.customer_client.descriptive_name || `Account ${row.customer_client.id}`,
        isManager: row.customer_client.manager || false,
        status: statusMap[row.customer_client.status] || 'UNKNOWN',
      }));
    } catch (error) {
      console.error('Failed to get client accounts:', error);
      throw new Error(`Failed to get client accounts: ${error.message}`);
    }
  }
}
