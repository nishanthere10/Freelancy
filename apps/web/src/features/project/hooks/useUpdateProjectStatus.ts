'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateProjectStatus, projectKeys, type ProjectStatus } from '../api';

export function useUpdateProjectStatus(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: ProjectStatus) =>
      updateProjectStatus(workspaceId, projectId, status),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(
        projectKeys.detail(workspaceId, project.id),
        project
      );
      toast.success(`Project status updated to ${project.status}`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update project status';
      toast.error(message);
    },
  });
}
