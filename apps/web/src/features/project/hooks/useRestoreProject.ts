'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { restoreProject, projectKeys } from '../api';

export function useRestoreProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => restoreProject(workspaceId, projectId),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(
        projectKeys.detail(workspaceId, project.id),
        project
      );
      toast.success(`Project "${project.name}" restored`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to restore project';
      toast.error(message);
    },
  });
}
