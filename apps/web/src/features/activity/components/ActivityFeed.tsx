'use client';

import { useActivity } from '../hooks/useActivity';
import type { ActivityFilters } from '../api/activity.types';
import { ActivityItem } from './ActivityItem';
import { ActivitySkeleton } from './ActivitySkeleton';
import { ActivityEmptyState } from './ActivityEmptyState';

interface ActivityFeedProps {
  workspaceId: string;
  filters?: ActivityFilters;
  title?: string;
  maxItems?: number;
  showCardWrapper?: boolean;
}

export function ActivityFeed({
  workspaceId,
  filters,
  title = 'Recent Activity',
  maxItems,
  showCardWrapper = true,
}: ActivityFeedProps) {
  const { data, isLoading, error, refetch } = useActivity(workspaceId, filters);

  const items = maxItems && data?.items ? data.items.slice(0, maxItems) : data?.items;

  const content = (
    <>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--color-ink-deep)] tracking-tight">
            {title}
          </h3>
          {data?.items && data.items.length > 0 && (
            <span className="text-xs text-[var(--color-steel)] font-medium">
              {data.items.length} {data.items.length === 1 ? 'event' : 'events'}
            </span>
          )}
        </div>
      )}

      {isLoading && <ActivitySkeleton />}

      {error && (
        <div className="p-4 text-center rounded-[var(--radius-xl)] bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error-border)] space-y-2">
          <p className="text-xs font-semibold">Failed to load activity</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 text-[11px] font-semibold bg-[var(--color-error)] text-white rounded-full hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (!items || items.length === 0) && (
        <ActivityEmptyState />
      )}

      {!isLoading && !error && items && items.length > 0 && (
        <div className="space-y-2.5">
          {items.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      )}
    </>
  );

  if (showCardWrapper) {
    return (
      <div className="section-card">
        {content}
      </div>
    );
  }

  return <div>{content}</div>;
}
