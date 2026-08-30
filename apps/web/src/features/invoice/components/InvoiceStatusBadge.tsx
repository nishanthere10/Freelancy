import type { InvoiceStatus } from '../api';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

const statusConfig: Record<
  InvoiceStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-[var(--color-surface-soft)]',
    text: 'text-[var(--color-charcoal)]',
    border: 'border-[var(--color-hairline-strong)]',
  },
  sent: {
    label: 'Sent',
    bg: 'bg-[var(--color-surface-pricing-featured)]',
    text: 'text-[var(--color-brand-blue)]',
    border: 'border-[var(--color-brand-blue)]/20',
  },
  paid: {
    label: 'Paid ✓',
    bg: 'bg-[var(--color-teal-light)]',
    text: 'text-[var(--color-moss-dark)]',
    border: 'border-[var(--color-brand-teal)]/30',
  },
  overdue: {
    label: 'Overdue',
    bg: 'bg-[var(--color-yellow-light)]',
    text: 'text-[var(--color-yellow-dark)]',
    border: 'border-[var(--color-brand-yellow)]/40',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-[var(--color-surface-soft)]',
    text: 'text-[var(--color-steel)]',
    border: 'border-[var(--color-hairline)]',
  },
};

export function InvoiceStatusBadge({ status, className = '' }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 fill-current bg-current opacity-75" />
      {config.label}
    </span>
  );
}
