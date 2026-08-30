import { Clock } from '@phosphor-icons/react';

interface ActivityEmptyStateProps {
  title?: string;
  description?: string;
}

export function ActivityEmptyState({
  title = 'No activity yet',
  description = 'Business actions like creating clients, updating projects, and issuing invoices will appear here.',
}: ActivityEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
      <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] flex items-center justify-center mb-3 shadow-xs">
        <Clock size={24} weight="duotone" />
      </div>
      <h4 className="text-sm font-bold text-[var(--color-ink-deep)] tracking-tight mb-1">
        {title}
      </h4>
      <p className="text-xs text-[var(--color-slate-text)] max-w-xs leading-relaxed">
        {description}
      </p>
    </div>
  );
}
