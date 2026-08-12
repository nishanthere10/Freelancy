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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'sent':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'overdue':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Receipt className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-base text-[var(--color-ink-deep,#0f172a)]">
            Recent Invoices
          </h3>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/invoices`}
          className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-1"
        >
          <span>View all</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-gray-200 rounded-xl space-y-1 bg-gray-50/50">
          <p className="text-xs font-medium text-gray-500">No invoices created yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="pb-3 font-semibold">Invoice #</th>
                <th className="pb-3 font-semibold">Client</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 font-mono font-semibold text-gray-900">
                    <Link
                      href={`/workspaces/${workspaceId}/invoices`}
                      className="hover:text-amber-600 transition-colors"
                    >
                      {inv.invoiceNumber || 'DRAFT'}
                    </Link>
                  </td>
                  <td className="py-3 font-medium text-gray-700">{inv.clientName}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border ${getStatusBadge(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono font-semibold text-gray-900">
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
