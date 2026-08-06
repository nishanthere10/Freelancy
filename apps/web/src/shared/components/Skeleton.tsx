/**
 * Skeleton loader placeholder
 * Animated loading state for content placeholders
 */

import { cn } from '@shared/utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-hairline-soft)]',
        className
      )}
      {...props}
    />
  );
}
