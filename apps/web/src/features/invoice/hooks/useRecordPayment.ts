'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { recordPayment, invoiceKeys, type RecordPaymentInput } from '../api';
import { dashboardKeys } from '@features/dashboard/api/dashboard.keys';

export function useRecordPayment(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecordPaymentInput }) =>
      recordPayment(workspaceId, id, data),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(workspaceId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(workspaceId) });
      toast.success(invoice.status === 'paid' ? 'Invoice marked as Paid' : 'Payment recorded');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to record payment';
      toast.error(message);
    },
  });
}
