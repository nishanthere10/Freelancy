'use client';

import Link from 'next/link';
import { Receipt, ArrowUpRight } from '@phosphor-icons/react';
import type { DashboardInvoiceSummaryData } from '../api/dashboard.types';

interface InvoiceSummaryCardProps {
  workspaceId: string;
  summary: DashboardInvoiceSummaryData;
}

export function InvoiceSummaryCard({ workspaceId, summary }: InvoiceSummaryCardProps) {
  const items = [
    { label: 'Paid', count: summary.paidCount, badgeClass: 'bg-[var(--color-teal-light)] text-[var(--color-moss-dark)] border-[var(--color-brand-teal)]/30' },
    { label: 'Sent', count: summary.sentCount, badgeClass: 'bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] border-[var(--color-brand-blue)]/20' },
    { label: 'Draft', count: summary.draftCount, badgeClass: 'bg-[var(--color-surface-soft)] text-[var(--color-charcoal)] border-[var(--color-hairline-strong)]' },
    { label: 'Overdue', count: summary.overdueCount, badgeClass: 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] border-[var(--color-brand-yellow)]/40' },
  ];

  return (
    <div className="section-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-rose-light)] text-[var(--color-brand-rose)]">
            <Receipt className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-base text-[var(--color-ink-deep)]">
            Invoice Breakdown
          </h3>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/invoices`}
          className="text-xs font-semibold text-[var(--color-brand-blue)] hover:text-[var(--color-blue-pressed)] hover:underline flex items-center gap-1 transition-colors"
        >
          <span>All invoices</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        {items.map((it) => (
          <div
            key={it.label}
            className="p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] flex items-center justify-between hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-canvas)] transition-all duration-150"
          >
            <span className="text-xs font-semibold text-[var(--color-charcoal)]">{it.label}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${it.badgeClass}`}>
              {it.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
