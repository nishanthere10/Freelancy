'use client';

/**
 * Hook to create workspace
 * Handles mutation + automatic query invalidation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createWorkspace, workspaceKeys, type CreateWorkspaceInput } from '../api';

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceInput) => createWorkspace(data),
    onSuccess: (workspace) => {
      // Invalidate list query to refetch
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });

      // Optionally set/cache the new workspace
      queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace);

      toast.success(`Workspace "${workspace.name}" created`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create workspace';
      toast.error(message);
    },
  });
}
