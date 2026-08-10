'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateInvoice, invoiceKeys, type UpdateInvoiceInput } from '../api';

export function useUpdateInvoice(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceInput }) =>
      updateInvoice(workspaceId, id, data),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(workspaceId) });
      toast.success('Draft invoice updated');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update invoice';
      toast.error(message);
    },
  });
}
