'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteClient, clientKeys } from '../api';

export function useDeleteClient(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => deleteClient(workspaceId, clientId),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.setQueryData(clientKeys.detail(workspaceId, client.id), client);
      toast.success(`Client "${client.name}" archived`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to archive client';
      toast.error(message);
    },
  });
}
