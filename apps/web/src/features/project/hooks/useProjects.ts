'use client';

import { useQuery } from '@tanstack/react-query';
import { getProjects, projectKeys, type ListProjectsFilters } from '../api';

export function useProjects(workspaceId: string, filters?: ListProjectsFilters) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId, filters as Record<string, unknown>),
    queryFn: () => getProjects(workspaceId, filters),
    enabled: Boolean(workspaceId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
