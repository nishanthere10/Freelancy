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
  valueColorClass = 'text-[var(--color-ink-deep)]',
  iconBgClass = 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)]',
}: MetricCardProps) {
  return (
    <Card className="stat-card group">
      <div className="space-y-1">
        <div className="text-[11px] font-bold text-[var(--color-slate-text)] uppercase tracking-wider">
          {label}
        </div>
        <div className={`text-3xl sm:text-4xl font-bold tracking-tight leading-none ${valueColorClass}`}>
          {value}
        </div>
        {subtext && (
          <div className="text-[12px] font-medium text-[var(--color-steel)] flex items-center gap-1 pt-0.5">
            {subtext}
          </div>
        )}
      </div>

      <div className={`w-14 h-14 rounded-[var(--radius-xl)] flex items-center justify-center font-bold text-xl transition-transform duration-200 group-hover:scale-110 shadow-xs ${iconBgClass}`}>
        {icon}
      </div>
    </Card>
  );
}
