export function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/40 bg-card/40 animate-pulse"
        >
          <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="flex items-center gap-2">
              <div className="h-3 bg-muted rounded w-20" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
