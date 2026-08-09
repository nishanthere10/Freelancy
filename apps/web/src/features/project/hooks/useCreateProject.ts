'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createProject, projectKeys, type CreateProjectInput } from '../api';

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectInput) => createProject(workspaceId, data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(workspaceId, project.id), project);
      toast.success(`Project "${project.name}" created`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create project';
      toast.error(message);
    },
  });
}
