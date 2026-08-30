export function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3.5 p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-hairline-soft)] bg-white"
        >
          <div className="w-8 h-8 rounded-[var(--radius-md)] skeleton-shimmer shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 skeleton-shimmer rounded-[var(--radius-sm)] w-3/4" />
            <div className="flex items-center gap-2">
              <div className="h-3 skeleton-shimmer rounded-[var(--radius-sm)] w-20" />
              <div className="h-3 skeleton-shimmer rounded-[var(--radius-sm)] w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
