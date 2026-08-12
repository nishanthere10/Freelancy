'use client';

import Link from 'next/link';
import { Warning, ArrowRight } from '@phosphor-icons/react';
import type { OverdueAlertDto } from '../api/dashboard.types';

interface OverdueAlertBannerProps {
  workspaceId: string;
  alerts: OverdueAlertDto[];
}

export function OverdueAlertBanner({ workspaceId, alerts }: OverdueAlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  const totalOverdue = alerts.reduce((acc, curr) => acc + curr.amountDue, 0);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-950 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500 text-white flex-shrink-0">
          <Warning className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm">
            {alerts.length} Overdue Invoice{alerts.length > 1 ? 's' : ''} Requiring Attention
          </h4>
          <p className="text-xs text-amber-900/80 mt-0.5">
            Total overdue balance awaiting payment: <span className="font-bold font-mono">₹{totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
      </div>

      <Link
        href={`/workspaces/${workspaceId}/invoices`}
        className="inline-flex items-center text-xs font-bold text-amber-900 hover:text-black gap-1.5 px-3.5 py-1.5 bg-amber-200/60 hover:bg-amber-200 rounded-xl transition-colors self-start sm:self-auto"
      >
        <span>View Overdue Invoices</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
