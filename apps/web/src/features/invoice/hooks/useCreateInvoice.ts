'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createInvoice, invoiceKeys, type CreateInvoiceInput } from '../api';

export function useCreateInvoice(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => createInvoice(workspaceId, data),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(workspaceId) });
      toast.success('Draft invoice created');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create invoice';
      toast.error(message);
    },
  });
}
