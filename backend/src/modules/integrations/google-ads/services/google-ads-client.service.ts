import { Injectable, Logger } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAdsClientService {
  private readonly logger = new Logger(GoogleAdsClientService.name);
  private client: GoogleAdsApi;

  constructor(private configService: ConfigService) {
    this.client = new GoogleAdsApi({
      client_id: this.configService.get('GOOGLE_CLIENT_ID'),
      client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
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
    const result = await (this.client as any).listAccessibleCustomers(refreshToken);
    // API returns { resource_names: [...] }, extract the array
    if (result && result.resource_names) {
      return result.resource_names;
    }
    // Fallback: if it's already an array, return as-is
    if (Array.isArray(result)) {
      return result;
    }
    return [];
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

    this.logger.log(`Using Manager Account ID: ${loginCustomerId} to list client accounts`);

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

      this.logger.log(`Found ${results.length} client accounts`);

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
      this.logger.error(`Failed to get client accounts: ${error.message}`);
      throw new Error(`Failed to get client accounts: ${error.message}`);
    }
  }

  /**
   * Get all selectable accounts by flattening accessible customers hierarchy (Option B)
   * This loops through all accessible accounts (MCC + Direct) and extracts child accounts
   * @param refreshToken - OAuth refresh token
   * @returns Flattened array of selectable accounts with id, name, type
   */
  async getAllSelectableAccounts(refreshToken: string): Promise<{
    id: string;
    name: string;
    type: 'ACCOUNT' | 'MANAGER';
    parentMccId?: string;
    parentMccName?: string;
    status: string;
  }[]> {
    // Step 1: Get all accessible customer IDs
    const accessibleCustomers = await this.listAccessibleCustomers(refreshToken);
    this.logger.log(`Found ${accessibleCustomers.length} accessible customers: ${accessibleCustomers.join(', ')}`);

    const allAccounts: {
      id: string;
      name: string;
      type: 'ACCOUNT' | 'MANAGER';
      parentMccId?: string;
      parentMccName?: string;
      status: string;
    }[] = [];

    const statusMap: Record<number, string> = {
      0: 'UNSPECIFIED',
      1: 'UNKNOWN',
      2: 'ENABLED',
      3: 'CANCELED',
      4: 'SUSPENDED',
      5: 'CLOSED',
    };

    // Step 2: Loop through each accessible customer and fetch its children
    for (const resourceName of accessibleCustomers) {
      const customerId = resourceName.replace('customers/', '');

      try {
        // Create customer instance for this account (using itself as login_customer_id)
        const customer = this.client.Customer({
          customer_id: customerId,
          refresh_token: refreshToken,
          login_customer_id: customerId, // Use this account as login context
        });

        // First, get info about this account itself
        const selfQuery = `
          SELECT
            customer.id,
            customer.descriptive_name,
            customer.manager,
            customer.status
          FROM customer
          LIMIT 1
        `;

        let accountInfo: any = null;
        try {
          const selfResult = await customer.query(selfQuery);
          if (selfResult.length > 0) {
            accountInfo = selfResult[0].customer;
          }
        } catch (e) {
          this.logger.warn(`Could not get self info for ${customerId}: ${e.message}`);
        }

        const isManager = accountInfo?.manager || false;
        const accountName = accountInfo?.descriptive_name || `Account ${customerId}`;
        const accountStatus = statusMap[accountInfo?.status] || 'UNKNOWN';

        if (isManager) {
          // This is a Manager (MCC) account - query its child accounts
          this.logger.debug(`${customerId} is MCC, fetching child accounts...`);

          const childQuery = `
            SELECT
              customer_client.id,
              customer_client.descriptive_name,
              customer_client.manager,
              customer_client.status
            FROM customer_client
            WHERE customer_client.manager = FALSE
          `;

          try {
            const childResults = await customer.query(childQuery);
            this.logger.log(`Found ${childResults.length} child accounts under MCC ${customerId}`);

            for (const row of childResults) {
              const childId = row.customer_client.id.toString();
              // Check if already added (avoid duplicates)
              if (!allAccounts.find(a => a.id === childId)) {
                allAccounts.push({
                  id: childId,
                  name: row.customer_client.descriptive_name || `Account ${childId}`,
                  type: 'ACCOUNT',
                  parentMccId: customerId,
                  parentMccName: accountName,
                  status: statusMap[row.customer_client.status] || 'UNKNOWN',
                });
              }
            }
          } catch (childError) {
            this.logger.warn(`Could not fetch children for MCC ${customerId}: ${childError.message}`);
          }
        } else {
          // This is a Direct account - add it directly
          this.logger.debug(`${customerId} is Direct Account, adding directly`);
          if (!allAccounts.find(a => a.id === customerId)) {
            allAccounts.push({
              id: customerId,
              name: accountName,
              type: 'ACCOUNT',
              status: accountStatus,
            });
          }
        }
      } catch (error) {
        this.logger.error(`Error processing accessible customer ${customerId}: ${error.message}`);
        // Continue with next account
      }
    }

    this.logger.log(`Total selectable accounts after flatten: ${allAccounts.length}`);
    return allAccounts;
  }
}
