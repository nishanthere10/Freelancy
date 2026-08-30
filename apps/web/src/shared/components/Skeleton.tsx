/**
 * Skeleton loader placeholder
 * Animated loading state for content placeholders
 */

import { cn } from '@shared/utils/cn';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer',
        className
      )}
      {...props}
    />
  );
}
