'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components';
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
    await createInvoiceMutation.mutateAsync(data);
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      className="max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar p-6 sm:p-8 rounded-2xl shadow-2xl"
    >
      <DialogContent className="space-y-6">
        <DialogHeader className="pb-4 border-b border-gray-100">
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
