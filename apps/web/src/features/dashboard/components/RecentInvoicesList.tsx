'use client';

import Link from 'next/link';
import { Receipt, ArrowUpRight } from '@phosphor-icons/react';
import type { RecentInvoiceDto } from '../api/dashboard.types';

interface RecentInvoicesListProps {
  workspaceId: string;
  invoices: RecentInvoiceDto[];
}

export function RecentInvoicesList({ workspaceId, invoices }: RecentInvoicesListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-[var(--color-teal-light)] text-[var(--color-moss-dark)] border-[var(--color-brand-teal)]/30';
      case 'sent':
        return 'bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] border-[var(--color-brand-blue)]/20';
      case 'overdue':
        return 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] border-[var(--color-brand-yellow)]/40';
      default:
        return 'bg-[var(--color-surface-soft)] text-[var(--color-charcoal)] border-[var(--color-hairline-strong)]';
    }
  };

  return (
    <div className="section-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-teal-light)] text-[var(--color-brand-teal)]">
            <Receipt className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-base text-[var(--color-ink-deep)]">
            Recent Invoices
          </h3>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/invoices`}
          className="text-xs font-semibold text-[var(--color-brand-blue)] hover:text-[var(--color-blue-pressed)] hover:underline flex items-center gap-1 transition-colors"
        >
          <span>View all</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="text-center py-8 px-4 border-2 border-dashed border-[var(--color-hairline)] rounded-[var(--radius-xl)] space-y-1 bg-[var(--color-surface-soft)]">
          <p className="text-xs font-medium text-[var(--color-steel)]">No invoices created yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono font-semibold text-[var(--color-ink-deep)]">
                    <Link
                      href={`/workspaces/${workspaceId}/invoices`}
                      className="hover:text-[var(--color-brand-blue)] transition-colors"
                    >
                      {inv.invoiceNumber || 'DRAFT'}
                    </Link>
                  </td>
                  <td className="font-medium text-[var(--color-charcoal)]">{inv.clientName}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border ${getStatusBadge(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="text-right font-mono font-semibold text-[var(--color-ink-deep)]">
                    ₹{inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
