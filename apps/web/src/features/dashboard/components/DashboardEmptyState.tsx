'use client';

import Link from 'next/link';
import { Button } from '@shared/components';
import { ChartPie, UserPlus, Plus } from '@phosphor-icons/react';

interface DashboardEmptyStateProps {
  workspaceId: string;
}

export function DashboardEmptyState({ workspaceId }: DashboardEmptyStateProps) {
  return (
    <div className="text-center py-16 px-8 border-2 border-dashed border-[var(--color-hairline)] rounded-[var(--radius-xxxl)] bg-[var(--color-canvas)] shadow-[var(--shadow-subtle)] space-y-5 max-w-xl mx-auto my-8">
      <div className="mx-auto h-16 w-16 rounded-[var(--radius-xl)] bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] flex items-center justify-center">
        <ChartPie className="h-8 w-8" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-[var(--color-ink-deep)] tracking-tight">
          Welcome to your workspace dashboard!
        </h3>
        <p className="text-sm text-[var(--color-slate-text)] max-w-md mx-auto leading-relaxed">
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
