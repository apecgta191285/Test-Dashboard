import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text = 'Loading...'
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="text-center">
        <Loader2 className={cn("animate-spin mx-auto mb-2 text-muted-foreground", sizeClasses[size])} />
        {text && <p className="text-muted-foreground text-sm">{text}</p>}
      </div>
    </div>
  );
}
