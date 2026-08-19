import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getActivity } from '../api/activity.api';
import type { ActivityFilters, ActivityListResponse } from '../api/activity.types';

export const activityKeys = {
  all: ['activity'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (workspaceId: string, filters?: ActivityFilters) =>
    [...activityKeys.lists(), workspaceId, filters] as const,
};

export function useActivity(
  workspaceId: string,
  filters?: ActivityFilters,
  options?: Omit<
    UseQueryOptions<ActivityListResponse, Error, ActivityListResponse, readonly unknown[]>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: activityKeys.list(workspaceId, filters),
    queryFn: () => getActivity(workspaceId, filters),
    enabled: Boolean(workspaceId),
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  });
}
