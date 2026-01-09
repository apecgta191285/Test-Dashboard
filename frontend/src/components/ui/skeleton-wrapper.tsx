import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SkeletonWrapperProps {
    children: ReactNode;
    isLoading: boolean;
    fullWidth?: boolean;
    className?: string;
}

export function SkeletonWrapper({
    children,
    isLoading,
    fullWidth = true,
    className,
}: SkeletonWrapperProps) {
    if (!isLoading) return <>{children}</>;

    return (
        <Skeleton
            className={cn(
                fullWidth && "w-full",
                className
            )}
        >
            <div className="opacity-0">{children}</div>
        </Skeleton>
    );
}
