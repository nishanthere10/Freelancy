import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteWorkspace, workspaceKeys } from '../api';

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: (_, deletedId) => {
      toast.success('Workspace deleted successfully');
      
      // Invalidate the workspaces list so it refetches
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      
      // Optionally remove the specific item from cache
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(deletedId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workspace');
    },
  });
}
