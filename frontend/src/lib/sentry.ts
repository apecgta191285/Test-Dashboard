import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for Frontend
 * เรียกใช้ใน main.tsx ก่อน render App
 */
export function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (!dsn) {
        console.log('⚠️ Sentry DSN not configured, skipping initialization');
        return;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE,

        // Performance Monitoring
        tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

        // Session Replay (optional)
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Integration settings
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
        ],

        // Don't send errors in development
        enabled: import.meta.env.MODE !== 'development',

        // Debug mode
        debug: import.meta.env.MODE !== 'production',
    });

    console.log('🔴 Sentry initialized for Frontend');
}

/**
 * Capture error manually
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
    Sentry.captureException(error, { extra: context });
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email: string; name?: string } | null) {
    if (user) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.name,
        });
    } else {
        Sentry.setUser(null);
    }
}
