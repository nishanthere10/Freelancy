import { apiGet } from '@api/client';
import type { ActivityFilters, ActivityListResponse } from './activity.types';

export async function getActivity(
  workspaceId: string,
  filters?: ActivityFilters
): Promise<ActivityListResponse> {
  const params = new URLSearchParams();
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.cursor) params.append('cursor', filters.cursor);
  if (filters?.entityType) params.append('entityType', filters.entityType);
  if (filters?.entityId) params.append('entityId', filters.entityId);
  if (filters?.actorUserId) params.append('actorUserId', filters.actorUserId);

  const queryString = params.toString();
  const url = `/workspaces/${workspaceId}/activity${queryString ? `?${queryString}` : ''}`;
  return apiGet<ActivityListResponse>(url);
}
