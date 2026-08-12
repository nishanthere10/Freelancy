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
    { label: 'Paid', count: summary.paidCount, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Sent', count: summary.sentCount, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Draft', count: summary.draftCount, badgeClass: 'bg-gray-100 text-gray-700 border-gray-200' },
    { label: 'Overdue', count: summary.overdueCount, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="p-6 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
            <Receipt className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-base text-[var(--color-ink-deep,#0f172a)]">
            Invoice Breakdown
          </h3>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/invoices`}
          className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-1"
        >
          <span>All invoices</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        {items.map((it) => (
          <div
            key={it.label}
            className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 flex items-center justify-between"
          >
            <span className="text-xs font-semibold text-gray-600">{it.label}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${it.badgeClass}`}>
              {it.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
