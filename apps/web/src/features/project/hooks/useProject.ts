'use client';

import { useQuery } from '@tanstack/react-query';
import { getProject, projectKeys } from '../api';

export function useProject(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(workspaceId, projectId),
    queryFn: () => getProject(workspaceId, projectId),
    enabled: Boolean(workspaceId) && Boolean(projectId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
