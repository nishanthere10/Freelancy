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
        valueColorClass="text-purple-700"
        iconBgClass="bg-purple-50 text-purple-600"
      />

      <MetricCard
        label="Total Collected"
        value={`${symbol}${overview.totalCollected.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        subtext="Cleared client payments"
        icon={<CheckCircle className="w-6 h-6" />}
        valueColorClass="text-emerald-600"
        iconBgClass="bg-emerald-50 text-emerald-600"
      />

      <MetricCard
        label="Balance Due"
        value={`${symbol}${overview.totalOutstanding.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        subtext="Awaiting collection"
        icon={<Clock className="w-6 h-6" />}
        valueColorClass="text-amber-600"
        iconBgClass="bg-amber-50 text-amber-600"
      />

      <MetricCard
        label="Active Work"
        value={`${overview.activeProjectsCount} Active`}
        subtext={`${overview.totalClientsCount} Total Clients`}
        icon={<Briefcase className="w-6 h-6" />}
        valueColorClass="text-blue-600"
        iconBgClass="bg-blue-50 text-blue-600"
      />
    </div>
  );
}
