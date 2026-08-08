'use client';

import { Button } from '@shared/components';
import { UserPlus } from '@phosphor-icons/react';

interface ClientEmptyStateProps {
  onCreateClick: () => void;
}

export function ClientEmptyState({ onCreateClick }: ClientEmptyStateProps) {
  return (
    <div className="text-center py-16 px-4 max-w-md mx-auto">
      <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
        <UserPlus className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-[var(--color-ink-deep)] mb-2">
        No clients added yet
      </h2>
      <p className="text-sm text-[var(--color-slate-text)] mb-6">
        Clients are the companies and individuals you work for. Add your first client to start organizing projects and invoices.
      </p>
      <Button onClick={onCreateClick}>
        <UserPlus className="h-4 w-4 mr-2" /> Add Your First Client
      </Button>
    </div>
  );
}
