'use client';

import { useDashboard } from '../hooks/useDashboard';
import { DashboardHeader } from './DashboardHeader';
import { DashboardOverview } from './DashboardOverview';
import { OverdueAlertBanner } from './OverdueAlertBanner';
import { ProjectDeadlines } from './ProjectDeadlines';
import { InvoiceSummaryCard } from './InvoiceSummaryCard';
import { RecentInvoicesList } from './RecentInvoicesList';
import { DashboardSkeleton } from './DashboardSkeleton';
import { DashboardEmptyState } from './DashboardEmptyState';
import { ActivityFeed } from '@features/activity';

interface DashboardPageProps {
  workspaceId: string;
}

export function DashboardPage({ workspaceId }: DashboardPageProps) {
  const { data: dashboard, isLoading, error, refetch } = useDashboard(workspaceId);

  if (isLoading) {
    return (
      <div className="p-6 sm:p-10 max-w-[1400px] w-full mx-auto bg-[var(--color-canvas,#f8fafc)] min-h-screen">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 sm:p-10 max-w-[1400px] w-full mx-auto bg-[var(--color-canvas,#f8fafc)] min-h-screen">
        <div className="p-8 text-center bg-red-50 text-red-700 rounded-2xl border border-red-200 max-w-lg mx-auto space-y-3">
          <p className="text-sm font-semibold">Failed to load dashboard</p>
          <p className="text-xs text-red-600">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isBrandNewWorkspace =
    dashboard?.overview.totalClientsCount === 0 &&
    dashboard?.overview.activeProjectsCount === 0 &&
    dashboard?.overview.totalInvoiced.amount === 0;

  if (isBrandNewWorkspace) {
    return (
      <div className="p-6 sm:p-10 max-w-[1400px] w-full mx-auto bg-[var(--color-canvas,#f8fafc)] min-h-screen space-y-8">
        <DashboardHeader workspaceId={workspaceId} />
        <DashboardEmptyState workspaceId={workspaceId} />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-[1400px] w-full mx-auto space-y-8 bg-[var(--color-canvas,#f8fafc)] min-h-screen">
      {/* Header */}
      <DashboardHeader workspaceId={workspaceId} />

      {/* Overdue Alert Banner */}
      {dashboard?.overdueAlerts && (
        <OverdueAlertBanner
          workspaceId={workspaceId}
          alerts={dashboard.overdueAlerts}
        />
      )}

      {/* KPI Overview Row */}
      {dashboard?.overview && (
        <DashboardOverview overview={dashboard.overview} />
      )}

      {/* Deliverables & Finance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectDeadlines
          workspaceId={workspaceId}
          deadlines={dashboard?.upcomingDeadlines || []}
        />
        <InvoiceSummaryCard
          workspaceId={workspaceId}
          summary={
            dashboard?.invoiceSummary || {
              draftCount: 0,
              sentCount: 0,
              paidCount: 0,
              overdueCount: 0,
              cancelledCount: 0,
            }
          }
        />
      </div>

      {/* Tables & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentInvoicesList
            workspaceId={workspaceId}
            invoices={dashboard?.recentInvoices || []}
          />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed workspaceId={workspaceId} maxItems={6} />
        </div>
      </div>
    </div>
  );
}
