'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateProject, projectKeys, type UpdateProjectInput } from '../api';

export function useUpdateProject(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProjectInput) =>
      updateProject(workspaceId, projectId, data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(
        projectKeys.detail(workspaceId, project.id),
        project
      );
      toast.success(`Project "${project.name}" updated`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update project';
      toast.error(message);
    },
  });
}
