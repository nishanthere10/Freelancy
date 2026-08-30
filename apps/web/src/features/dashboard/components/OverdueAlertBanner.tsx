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
    <div className="p-4 sm:p-5 rounded-[var(--radius-xl)] bg-[var(--color-yellow-light)] border border-[var(--color-brand-yellow)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[var(--color-yellow-dark)] shadow-[var(--shadow-subtle)]">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-[var(--radius-lg)] bg-[var(--color-brand-yellow)] text-[var(--color-primary)] flex-shrink-0">
          <Warning className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-[var(--color-yellow-dark)]">
            {alerts.length} Overdue Invoice{alerts.length > 1 ? 's' : ''} Requiring Attention
          </h4>
          <p className="text-xs text-[var(--color-yellow-dark)] opacity-85 mt-0.5">
            Total overdue balance awaiting payment: <span className="font-bold font-mono">₹{totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
      </div>

      <Link
        href={`/workspaces/${workspaceId}/invoices`}
        className="inline-flex items-center text-xs font-bold text-[var(--color-primary)] gap-1.5 px-4 py-2 bg-[var(--color-brand-yellow)] hover:bg-[var(--color-brand-yellow-deep)] rounded-full transition-all duration-150 active:scale-[0.98] self-start sm:self-auto"
      >
        <span>View Overdue Invoices</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
