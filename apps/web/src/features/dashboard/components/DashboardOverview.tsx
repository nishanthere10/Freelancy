'use client';

import { Receipt, CheckCircle, Clock, Briefcase } from '@phosphor-icons/react';
import type { DashboardOverviewData } from '../api/dashboard.types';
import { MetricCard } from './MetricCard';

interface DashboardOverviewProps {
  overview: DashboardOverviewData;
}

export function DashboardOverview({ overview }: DashboardOverviewProps) {
  const symbol = overview.totalInvoiced.currency === 'INR' ? '₹' : '$';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        label="Total Invoiced"
        value={`${symbol}${overview.totalInvoiced.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        subtext="Gross billed value"
        icon={<Receipt className="w-6 h-6" />}
        valueColorClass="text-[var(--color-brand-blue)]"
        iconBgClass="bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)]"
      />

      <MetricCard
        label="Total Collected"
        value={`${symbol}${overview.totalCollected.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        subtext="Cleared client payments"
        icon={<CheckCircle className="w-6 h-6" />}
        valueColorClass="text-[var(--color-success-accent)]"
        iconBgClass="bg-[var(--color-teal-light)] text-[var(--color-brand-teal)]"
      />

      <MetricCard
        label="Balance Due"
        value={`${symbol}${overview.totalOutstanding.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        subtext="Awaiting collection"
        icon={<Clock className="w-6 h-6" />}
        valueColorClass="text-[var(--color-yellow-dark)]"
        iconBgClass="bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)]"
      />

      <MetricCard
        label="Active Work"
        value={`${overview.activeProjectsCount} Active`}
        subtext={`${overview.totalClientsCount} Total Clients`}
        icon={<Briefcase className="w-6 h-6" />}
        valueColorClass="text-[var(--color-primary)]"
        iconBgClass="bg-[var(--color-rose-light)] text-[var(--color-brand-rose)]"
      />
    </div>
  );
}
