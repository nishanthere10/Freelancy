'use client';

import Link from 'next/link';
import { Button } from '@shared/components';
import { ChartPie, Plus, Briefcase } from '@phosphor-icons/react';

interface DashboardHeaderProps {
  workspaceId: string;
  onOpenCreateInvoice?: () => void;
}

export function DashboardHeader({ workspaceId }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-semibold">
          <ChartPie className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep,#0f172a)] tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-slate-text,#64748b)]">
            Business overview, cash flow metrics, active deliverables, and invoice status.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <Link href={`/workspaces/${workspaceId}/invoices`}>
          <Button className="shadow-xs rounded-full">
            <Plus className="h-4 w-4 mr-1.5" /> Create Invoice
          </Button>
        </Link>
        <Link href={`/workspaces/${workspaceId}/projects`}>
          <Button variant="outline" className="rounded-full">
            <Briefcase className="h-4 w-4 mr-1.5" /> Add Project
          </Button>
        </Link>
      </div>
    </div>
  );
}
