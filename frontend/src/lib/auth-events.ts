// src/lib/auth-events.ts
// Simple Event Emitter for handling 401 Unauthorized events
// This allows api-client to communicate with React components without hard reload

import { useEffect, useCallback } from 'react';

// =============================================================================
// Event Types
// =============================================================================
export const AUTH_EVENTS = {
  SESSION_EXPIRED: 'auth:session-expired',
  LOGOUT_REQUIRED: 'auth:logout-required',
  UNAUTHORIZED: 'auth:unauthorized',
} as const;

export type AuthEventType = typeof AUTH_EVENTS[keyof typeof AUTH_EVENTS];

// =============================================================================
// Event Emitter Class
// =============================================================================
class AuthEventEmitter {
  private listeners: Map<string, Set<() => void>> = new Map();

  /**
   * Subscribe to an auth event
   */
  on(event: AuthEventType, callback: () => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an auth event to all listeners
   */
  emit(event: AuthEventType): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          console.error(`Error in auth event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  off(event: AuthEventType): void {
    this.listeners.delete(event);
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const authEvents = new AuthEventEmitter();

// =============================================================================
// Helper Functions (for use in api-client)
// =============================================================================

/**
 * Dispatch session expired event - use this in api-client when token refresh fails
 */
export function dispatchSessionExpired(): void {
  authEvents.emit(AUTH_EVENTS.SESSION_EXPIRED);
}

/**
 * Dispatch unauthorized event - use this for 401 responses
 */
export function dispatchUnauthorized(): void {
  authEvents.emit(AUTH_EVENTS.UNAUTHORIZED);
}

// =============================================================================
// React Hook for listening to auth events
// =============================================================================

/**
 * Hook to listen for session expiry events
 * Use this in App.tsx or AuthProvider to handle logout
 */
export function useAuthEventListener(onSessionExpired: () => void): void {
  const stableCallback = useCallback(onSessionExpired, [onSessionExpired]);

  useEffect(() => {
    // Subscribe to session expired event
    const unsubscribeExpired = authEvents.on(
      AUTH_EVENTS.SESSION_EXPIRED,
      stableCallback
    );

    // Subscribe to unauthorized event (same handler)
    const unsubscribeUnauthorized = authEvents.on(
      AUTH_EVENTS.UNAUTHORIZED,
      stableCallback
    );

    // Cleanup on unmount
    return () => {
      unsubscribeExpired();
      unsubscribeUnauthorized();
    };
  }, [stableCallback]);
}

/**
 * Hook to listen for specific auth event
 */
export function useAuthEvent(
  event: AuthEventType,
  callback: () => void
): void {
  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    const unsubscribe = authEvents.on(event, stableCallback);
    return unsubscribe;
  }, [event, stableCallback]);
}
