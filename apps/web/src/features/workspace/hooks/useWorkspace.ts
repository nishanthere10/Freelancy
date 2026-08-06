'use client';

/**
 * Hook to fetch single workspace by ID
 */

import { useQuery } from '@tanstack/react-query';
import { getWorkspace, workspaceKeys } from '../api';

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: id ? workspaceKeys.detail(id) : ['workspaces', 'detail', 'undefined'],
    queryFn: () => {
      if (!id) throw new Error('Workspace ID required');
      return getWorkspace(id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
