'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components';
import { useUpdateInvoice } from '../hooks';
import type { CreateInvoiceInput, InvoiceResponse } from '../api';
import { CreateInvoiceForm } from './CreateInvoiceForm';

interface EditInvoiceDialogProps {
  workspaceId: string;
  invoice: InvoiceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInvoiceDialog({
  workspaceId,
  invoice,
  open,
  onOpenChange,
}: EditInvoiceDialogProps) {
  const updateInvoiceMutation = useUpdateInvoice(workspaceId);

  if (!invoice) return null;

  const initialData: Partial<CreateInvoiceInput> = {
    clientId: invoice.clientId,
    projectId: invoice.projectId || undefined,
    issueDate: invoice.issueDate || undefined,
    dueDate: invoice.dueDate || undefined,
    taxRate: invoice.taxRate || '18.00',
    discountRate: invoice.discountRate || '0.00',
    notes: invoice.notes || undefined,
    terms: invoice.terms || undefined,
    items: invoice.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      sortOrder: it.sortOrder,
    })),
  };

  const handleSubmit = async (data: CreateInvoiceInput) => {
    await updateInvoiceMutation.mutateAsync({ id: invoice.id, data });
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
          <DialogTitle className="text-xl font-bold text-[var(--color-ink-deep)]">Edit Draft Invoice</DialogTitle>
          <p className="text-xs text-[var(--color-slate-text)]">
            Update invoice details, line items, or payment terms. Only draft invoices can be edited.
          </p>
        </DialogHeader>
        <CreateInvoiceForm
          workspaceId={workspaceId}
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={updateInvoiceMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
