import { Receipt, Plus } from '@phosphor-icons/react';
import { Button } from '@shared/components';

interface InvoiceEmptyStateProps {
  onCreateClick: () => void;
}

export function InvoiceEmptyState({ onCreateClick }: InvoiceEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm my-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-inner">
        <Receipt className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-[var(--color-ink-deep)]">No Invoices Found</h3>
      <p className="text-sm text-[var(--color-slate-text)] max-w-md mt-1 mb-6">
        Create your first invoice to bill clients, calculate GST tax, and track payments.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" /> Create Invoice
      </Button>
    </div>
  );
}
