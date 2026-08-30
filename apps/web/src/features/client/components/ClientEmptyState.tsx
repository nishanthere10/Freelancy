'use client';

import { Button } from '@shared/components';
import { UserPlus } from '@phosphor-icons/react';

interface ClientEmptyStateProps {
  onCreateClick: () => void;
}

export function ClientEmptyState({ onCreateClick }: ClientEmptyStateProps) {
  return (
    <div className="text-center py-16 px-8 border-2 border-dashed border-[var(--color-hairline)] rounded-[var(--radius-xxxl)] bg-[var(--color-canvas)] shadow-[var(--shadow-subtle)] space-y-5 max-w-xl mx-auto my-8">
      <div className="h-16 w-16 bg-[var(--color-teal-light)] rounded-[var(--radius-xl)] flex items-center justify-center mx-auto text-[var(--color-brand-teal)]">
        <UserPlus className="h-8 w-8" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-[var(--color-ink-deep)] tracking-tight">
          No clients added yet
        </h2>
        <p className="text-sm text-[var(--color-slate-text)] max-w-md mx-auto leading-relaxed">
          Clients are the companies and individuals you work for. Add your first client to start organizing projects and invoices.
        </p>
      </div>
      <Button onClick={onCreateClick} className="rounded-full shadow-xs">
        <UserPlus className="h-4 w-4 mr-2" /> Add Your First Client
      </Button>
    </div>
  );
}
