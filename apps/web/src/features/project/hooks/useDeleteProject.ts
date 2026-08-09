'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteProject, projectKeys } from '../api';

export function useDeleteProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => deleteProject(workspaceId, projectId),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(
        projectKeys.detail(workspaceId, project.id),
        project
      );
      toast.success(`Project "${project.name}" archived`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to archive project';
      toast.error(message);
    },
  });
}
