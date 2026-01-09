import { cn } from '@/lib/utils';

export type StatusVariant =
    | 'active' | 'paused' | 'ended' | 'draft' | 'default'
    | 'admin' | 'manager' | 'client'
    | 'success' | 'warning' | 'error' | 'info';

interface StatusBadgeProps {
    status: string;
    variant?: StatusVariant;
    className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
    // Status variants
    active: 'bg-green-100 text-green-800',
    success: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    warning: 'bg-yellow-100 text-yellow-800',
    ended: 'bg-red-100 text-red-800',
    error: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
    default: 'bg-gray-100 text-gray-800',
    info: 'bg-blue-100 text-blue-800',
    // Role variants
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    client: 'bg-green-100 text-green-800',
};

// Auto-detect variant from status string
function getVariantFromStatus(status: string): StatusVariant {
    const normalized = status.toUpperCase();

    // Campaign status
    if (normalized === 'ACTIVE' || normalized === 'ENABLED') return 'active';
    if (normalized === 'PAUSED') return 'paused';
    if (normalized === 'ENDED' || normalized === 'REMOVED' || normalized === 'DELETED') return 'ended';
    if (normalized === 'DRAFT') return 'draft';

    // Role
    if (normalized === 'ADMIN') return 'admin';
    if (normalized === 'MANAGER') return 'manager';
    if (normalized === 'CLIENT' || normalized === 'USER') return 'client';

    return 'default';
}

export function StatusBadge({
    status,
    variant,
    className
}: StatusBadgeProps) {
    const resolvedVariant = variant || getVariantFromStatus(status);

    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            variantStyles[resolvedVariant],
            className
        )}>
            {status}
        </span>
    );
}
