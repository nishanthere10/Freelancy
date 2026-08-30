'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components';
import { toast } from 'sonner';
import { useCreateInvoice } from '../hooks';
import type { CreateInvoiceInput } from '../api';
import { CreateInvoiceForm } from './CreateInvoiceForm';

interface CreateInvoiceDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInvoiceDialog({ workspaceId, open, onOpenChange }: CreateInvoiceDialogProps) {
  const createInvoiceMutation = useCreateInvoice(workspaceId);

  const handleSubmit = async (data: CreateInvoiceInput) => {
    try {
      await createInvoiceMutation.mutateAsync(data);
      toast.success('Invoice created successfully');
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create invoice';
      toast.error(message);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      className="max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar p-6 sm:p-8 rounded-[var(--radius-xxl)] shadow-[var(--shadow-modal)]"
    >
      <DialogContent className="space-y-6">
        <DialogHeader className="pb-4 border-b border-[var(--color-hairline-soft)]">
          <DialogTitle className="text-xl font-bold text-[var(--color-ink-deep)]">Create New Invoice</DialogTitle>
          <p className="text-xs text-[var(--color-slate-text)]">
            Draft an invoice for client payment tracking. Serial INV number will be assigned upon sending.
          </p>
        </DialogHeader>
        <CreateInvoiceForm
          workspaceId={workspaceId}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createInvoiceMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
