import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateWorkspace } from '../api';
import type { UpdateWorkspaceInput } from '../api';

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceInput }) =>
      updateWorkspace(id, data),
    onSuccess: (updatedWorkspace) => {
      toast.success('Workspace updated successfully');
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.setQueryData(['workspaces', updatedWorkspace.id], updatedWorkspace);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update workspace');
    },
  });
}
