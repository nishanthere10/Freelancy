import { Calendar, CurrencyInr, Eye, User, Folder } from '@phosphor-icons/react';
import type { InvoiceResponse } from '../api';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

interface InvoiceCardProps {
  invoice: InvoiceResponse;
  onSelect: (invoice: InvoiceResponse) => void;
}

export function InvoiceCard({ invoice, onSelect }: InvoiceCardProps) {
  return (
    <div
      onClick={() => onSelect(invoice)}
      className="group relative bg-white p-5 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] border-t-4 border-t-[var(--color-brand-rose)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-[var(--color-slate-text)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline-soft)]">
            {invoice.invoiceNumber || 'DRAFT'}
          </span>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div>
          <div className="flex items-center text-sm font-semibold text-[var(--color-ink-deep)] group-hover:text-[var(--color-brand-blue)] transition-colors">
            <User className="h-4 w-4 mr-1.5 text-gray-400 shrink-0" />
            <span className="truncate">{invoice.clientName || 'Unassigned Client'}</span>
          </div>

          {invoice.projectName && (
            <div className="flex items-center text-xs text-[var(--color-slate-text)] mt-1">
              <Folder className="h-3.5 w-3.5 mr-1.5 text-gray-400 shrink-0" />
              <span className="truncate">{invoice.projectName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Amount</div>
          <div className="text-lg font-bold text-[var(--color-ink-deep)] flex items-center">
            <CurrencyInr className="h-4 w-4 mr-0.5" />
            {Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Due Date</div>
          <div className="text-xs font-medium text-slate-600 flex items-center justify-end mt-0.5">
            <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
            {invoice.dueDate || 'Not set'}
          </div>
        </div>
      </div>
    </div>
  );
}
