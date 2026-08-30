import { Receipt, Plus } from '@phosphor-icons/react';
import { Button } from '@shared/components';

interface InvoiceEmptyStateProps {
  onCreateClick: () => void;
}

export function InvoiceEmptyState({ onCreateClick }: InvoiceEmptyStateProps) {
  return (
    <div className="text-center py-16 px-8 border-2 border-dashed border-[var(--color-hairline)] rounded-[var(--radius-xxxl)] bg-[var(--color-canvas)] shadow-[var(--shadow-subtle)] space-y-5 max-w-xl mx-auto my-8">
      <div className="w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--color-rose-light)] text-[var(--color-brand-rose)] flex items-center justify-center mx-auto">
        <Receipt className="w-8 h-8" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-[var(--color-ink-deep)] tracking-tight">No Invoices Found</h3>
        <p className="text-sm text-[var(--color-slate-text)] max-w-md mx-auto leading-relaxed">
          Create your first invoice to bill clients, calculate GST tax, and track payments.
        </p>
      </div>
      <Button onClick={onCreateClick} className="rounded-full shadow-xs">
        <Plus className="h-4 w-4 mr-2" /> Create Invoice
      </Button>
    </div>
  );
}
