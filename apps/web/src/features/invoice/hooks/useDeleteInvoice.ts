'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteInvoice, invoiceKeys } from '../api';

export function useDeleteInvoice(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInvoice(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(workspaceId) });
      toast.success('Draft invoice deleted');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete invoice';
      toast.error(message);
    },
  });
}
