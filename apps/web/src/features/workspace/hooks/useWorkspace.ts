'use client';

/**
 * Hook to fetch a single workspace by ID
 */

import { useQuery } from '@tanstack/react-query';
import { getWorkspace, workspaceKeys } from '../api';
import type { WorkspaceResponse } from '../api';

export function useWorkspace(workspaceId?: string) {
  return useQuery<WorkspaceResponse>({
    queryKey: workspaceId ? workspaceKeys.detail(workspaceId) : workspaceKeys.lists(),
    queryFn: () => {
      if (!workspaceId) throw new Error('Workspace ID is required');
      return getWorkspace(workspaceId);
    },
    enabled: Boolean(workspaceId),
  });
}
