'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cancelInvoice, invoiceKeys } from '../api';

export function useCancelInvoice(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelInvoice(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(workspaceId) });
      toast.success('Invoice cancelled');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to cancel invoice';
      toast.error(message);
    },
  });
}
