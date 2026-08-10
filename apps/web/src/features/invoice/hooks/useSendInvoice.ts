'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sendInvoice, invoiceKeys, type SendInvoiceInput } from '../api';

export function useSendInvoice(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: SendInvoiceInput }) =>
      sendInvoice(workspaceId, id, data),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(workspaceId) });
      toast.success(`Invoice "${invoice.invoiceNumber}" issued`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to issue invoice';
      toast.error(message);
    },
  });
}
