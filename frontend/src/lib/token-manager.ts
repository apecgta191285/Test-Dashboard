// src/lib/token-manager.ts
// =============================================================================
// Standalone Token Storage Module
// NO imports from auth-store or api-client to avoid circular dependency
// =============================================================================

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export interface TokenPair {
    accessToken: string | null;
    refreshToken: string | null;
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
    try {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
        return null;
    }
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
    try {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
        return null;
    }
}

/**
 * Get both tokens as a pair
 */
export function getTokens(): TokenPair {
    return {
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
    };
}

/**
 * Store both tokens in localStorage
 */
export function setTokens(accessToken: string, refreshToken: string): void {
    try {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
        console.error('Failed to store tokens:', error);
    }
}

/**
 * Clear all tokens from localStorage (logout)
 */
export function clearTokens(): void {
    try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
        console.error('Failed to clear tokens:', error);
    }
}

/**
 * Check if user has a valid access token
 */
export function hasToken(): boolean {
    return !!getAccessToken();
}
