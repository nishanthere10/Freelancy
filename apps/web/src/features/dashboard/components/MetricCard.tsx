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
    <Card className="p-6 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-gradient-to-br from-white to-[var(--color-surface-soft)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
      <div className="space-y-1">
        <div className="text-[11px] font-bold text-[var(--color-slate-text)] uppercase tracking-wider">
          {label}
        </div>
        <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${valueColorClass}`}>
          {value}
        </div>
        {subtext && (
          <div className="text-[12px] font-medium text-[var(--color-steel)] flex items-center gap-1">
            {subtext}
          </div>
        )}
      </div>

      <div className={`w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center font-bold text-xl transition-transform duration-200 group-hover:scale-110 shadow-xs ${iconBgClass}`}>
        {icon}
      </div>
    </Card>
  );
}
