/**
 * OAuth Provider Interface
 * 
 * Shared interface that standardizes OAuth flow across all ad platforms.
 * Implements the 3-step flow pattern from Google Ads:
 * 1. generateAuthUrl() - Create OAuth authorization URL
 * 2. handleCallback() - Exchange code for tokens, return account list
 * 3. completeConnection() - Save selected account to database
 * 
 * @see docs/plans/integration-spec-mapping.md for full specification
 */

/**
 * Configuration for OAuth endpoints and parameters
 * Different platforms use different parameter names (e.g., app_id vs client_id)
 */
export interface OAuthConfig {
    /** Authorization URL (e.g., https://ads.tiktok.com/marketing_api/auth) */
    authUrl: string;
    /** Token exchange URL */
    tokenUrl: string;
    /** Token refresh URL (optional, some platforms use same as tokenUrl) */
    refreshUrl?: string;
    /** Parameter name for client ID (client_id, app_id, channel_id) */
    clientIdParam: string;
    /** Parameter name for client secret (client_secret, secret) */
    clientSecretParam: string;
    /** Parameter name for authorization code (code, auth_code) */
    codeParam: string;
    /** Content type for token requests */
    contentType: 'json' | 'form-urlencoded';
}

/**
 * Account information returned during OAuth callback
 */
export interface OAuthAccount {
    /** Unique account/advertiser ID */
    id: string;
    /** Display name for the account */
    name: string;
    /** Account status (ACTIVE, ENABLED, etc.) */
    status?: string;
    /** Account type (optional) */
    type?: string;
}

/**
 * Result from handleCallback() method
 */
export interface OAuthCallbackResult {
    /** 
     * Status of the callback:
     * - 'select_account': Multiple accounts found, user must select one
     * - 'success': Single account connected directly
     */
    status: 'select_account' | 'success';
    /** List of available accounts (when status = 'select_account') */
    accounts?: OAuthAccount[];
    /** Temporary token for account selection flow */
    tempToken?: string;
    /** Connected account ID (when status = 'success') */
    accountId?: string;
}

/**
 * Result from completeConnection() method
 */
export interface OAuthConnectionResult {
    success: boolean;
    accountId: string;
    accountName?: string;
}

/**
 * Token response from OAuth provider
 */
export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    expiresAt?: Date;
}

/**
 * OAuth Provider Interface
 * 
 * All ad platform OAuth services should implement this interface
 * to ensure consistent behavior across Google, TikTok, Facebook, LINE, etc.
 */
export interface OAuthProvider {
    /**
     * Generate OAuth authorization URL
     * 
     * @param userId - Current user's ID (for state validation)
     * @param tenantId - Tenant ID for multi-tenant support
     * @returns Full OAuth URL to redirect user to
     */
    generateAuthUrl(userId: string, tenantId: string): string;

    /**
     * Handle OAuth callback from provider
     * 
     * This method should:
     * 1. Verify state parameter
     * 2. Exchange authorization code for tokens
     * 3. Fetch available accounts
     * 4. Store tokens temporarily in cache
     * 5. Return account list for user selection
     * 
     * @param code - Authorization code from OAuth provider
     * @param state - State parameter for CSRF protection
     * @returns Callback result with accounts and temp token
     */
    handleCallback(code: string, state: string): Promise<OAuthCallbackResult>;

    /**
     * Get temporary accounts for selection
     * 
     * @param tempToken - Temporary token from handleCallback
     * @returns List of available accounts
     */
    getTempAccounts(tempToken: string): Promise<OAuthAccount[]>;

    /**
     * Complete connection after user selects an account
     * 
     * This method should:
     * 1. Retrieve tokens from cache using tempToken
     * 2. Create/update account record in database
     * 3. Encrypt tokens before storage
     * 4. Clear temporary cache
     * 5. Optionally trigger initial sync
     * 
     * @param tempToken - Temporary token from handleCallback
     * @param accountId - Selected account/advertiser ID
     * @param tenantId - Tenant ID for multi-tenant support
     * @returns Connection result with account ID
     */
    completeConnection(
        tempToken: string,
        accountId: string,
        tenantId: string,
    ): Promise<OAuthConnectionResult>;

    /**
     * Refresh access token using refresh token
     * 
     * @param accountId - Database account ID
     * @param tenantId - Tenant ID
     * @returns Fresh access token
     */
    refreshAccessToken(accountId: string, tenantId: string): Promise<string>;

    /**
     * Get all connected accounts for a tenant
     * 
     * @param tenantId - Tenant ID
     * @returns List of connected accounts
     */
    getConnectedAccounts(tenantId: string): Promise<any[]>;

    /**
     * Disconnect all accounts for a tenant
     * 
     * @param tenantId - Tenant ID
     * @returns Success status
     */
    disconnect(tenantId: string): Promise<boolean>;
}

/**
 * Optional: Check if running in sandbox mode
 * Implemented by providers that support sandbox environments (e.g., TikTok)
 */
export interface SandboxSupport {
    /**
     * Check if running in sandbox mode
     */
    isSandboxMode(): boolean;

    /**
     * Connect using sandbox credentials directly
     * 
     * @param tenantId - Tenant ID
     * @returns Connection result
     */
    connectSandbox(tenantId: string): Promise<OAuthConnectionResult>;
}
