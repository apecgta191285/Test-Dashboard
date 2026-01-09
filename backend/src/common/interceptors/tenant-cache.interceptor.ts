import { ExecutionContext, Injectable, CallHandler } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

/**
 * Tenant-aware Cache Interceptor
 * 
 * Extends default CacheInterceptor to include tenantId in cache key.
 * This prevents data leakage between tenants in multi-tenant applications.
 * 
 * Cache key format: "tenant-{tenantId}-{originalKey}"
 */
@Injectable()
export class TenantCacheInterceptor extends CacheInterceptor {
    trackBy(context: ExecutionContext): string | undefined {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const tenantId = user?.tenantId || 'anonymous';

        // Get the original cache key
        const originalKey = super.trackBy(context);

        if (!originalKey) {
            return undefined;
        }

        // Include tenantId in cache key to prevent data leakage
        return `tenant-${tenantId}-${originalKey}`;
    }
}
