'use client';

import Link from 'next/link';
import { Button } from '@shared/components';
import { ChartPie, UserPlus, Plus } from '@phosphor-icons/react';

interface DashboardEmptyStateProps {
  workspaceId: string;
}

export function DashboardEmptyState({ workspaceId }: DashboardEmptyStateProps) {
  return (
    <div className="text-center py-16 px-6 border-2 border-dashed border-gray-200 rounded-3xl bg-white space-y-4 max-w-xl mx-auto my-8">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
        <ChartPie className="h-8 w-8" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-bold text-[var(--color-ink-deep,#0f172a)]">
          Welcome to your workspace dashboard!
        </h3>
        <p className="text-xs text-[var(--color-slate-text,#64748b)] max-w-md mx-auto leading-relaxed">
          Create your first client record, deliverable project, or GST invoice to view real-time financial metrics and operational insights here.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Link href={`/workspaces/${workspaceId}/clients`}>
          <Button className="rounded-full text-xs">
            <UserPlus className="h-4 w-4 mr-1.5" /> Add First Client
          </Button>
        </Link>
        <Link href={`/workspaces/${workspaceId}/invoices`}>
          <Button variant="outline" className="rounded-full text-xs">
            <Plus className="h-4 w-4 mr-1.5" /> Create Invoice
          </Button>
        </Link>
      </div>
    </div>
  );
}
