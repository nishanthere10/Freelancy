'use client';

import type { ReactNode } from 'react';
import { Card } from '@shared/components';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: ReactNode;
  valueColorClass?: string;
  iconBgClass?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  icon,
  valueColorClass = 'text-[var(--color-ink-deep,#0f172a)]',
  iconBgClass = 'bg-amber-50 text-amber-600',
}: MetricCardProps) {
  return (
    <Card className="p-6 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] bg-white shadow-sm hover:shadow-md transition-all flex items-center justify-between">
      <div className="space-y-1">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </div>
        <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${valueColorClass}`}>
          {value}
        </div>
        {subtext && (
          <div className="text-[11px] font-medium text-gray-500">
            {subtext}
          </div>
        )}
      </div>

      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${iconBgClass}`}>
        {icon}
      </div>
    </Card>
  );
}
