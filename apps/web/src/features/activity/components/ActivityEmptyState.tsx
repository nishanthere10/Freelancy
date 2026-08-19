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
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border/60 bg-card/30">
      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3 shadow-inner">
        <Clock size={24} weight="duotone" />
      </div>
      <h4 className="text-sm font-semibold text-foreground tracking-tight mb-1">
        {title}
      </h4>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
        {description}
      </p>
    </div>
  );
}
