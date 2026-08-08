'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateClient, clientKeys, type UpdateClientInput } from '../api';

export function useUpdateClient(workspaceId: string, clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateClientInput) => updateClient(workspaceId, clientId, data),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.setQueryData(clientKeys.detail(workspaceId, clientId), client);
      toast.success(`Client "${client.name}" updated`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update client';
      toast.error(message);
    },
  });
}
