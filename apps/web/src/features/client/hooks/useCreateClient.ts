'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient, clientKeys, type CreateClientInput } from '../api';

export function useCreateClient(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientInput) => createClient(workspaceId, data),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.setQueryData(clientKeys.detail(workspaceId, client.id), client);
      toast.success(`Client "${client.name}" created`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create client';
      toast.error(message);
    },
  });
}
