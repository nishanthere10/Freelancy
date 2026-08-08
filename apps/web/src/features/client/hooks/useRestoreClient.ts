'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { restoreClient, clientKeys } from '../api';

export function useRestoreClient(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => restoreClient(workspaceId, clientId),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.setQueryData(clientKeys.detail(workspaceId, client.id), client);
      toast.success(`Client "${client.name}" restored`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to restore client';
      toast.error(message);
    },
  });
}
