import { cn } from '@/lib/utils';

interface EmptyStateProps {
    hasSearch?: boolean;
    searchMessage?: string;
    emptyMessage?: string;
    className?: string;
}

export function EmptyState({
    hasSearch = false,
    searchMessage = 'No results found',
    emptyMessage = 'No items yet',
    className,
}: EmptyStateProps) {
    return (
        <div className={cn("text-center py-12", className)}>
            <p className="text-muted-foreground">
                {hasSearch ? searchMessage : emptyMessage}
            </p>
        </div>
    );
}
