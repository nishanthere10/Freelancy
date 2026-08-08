'use client';

/**
 * Empty state when no workspaces exist
 * Encourages user to create their first workspace
 */

import { Button } from '@shared/components';
import { Briefcase, Plus } from '@phosphor-icons/react';

interface WorkspaceEmptyStateProps {
  onCreateClick: () => void;
}

export function WorkspaceEmptyState({ onCreateClick }: WorkspaceEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-28 px-4">
      <div className="text-center max-w-sm">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div
            className="h-20 w-20 rounded-[var(--radius-xxxl)] flex items-center justify-center"
            style={{ background: 'var(--color-surface-pricing-featured)' }}
          >
            <Briefcase size={36} style={{ color: 'var(--color-brand-blue)' }} />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-medium mb-3 block"
          style={{ color: 'var(--color-ink-deep)', letterSpacing: '-0.5px' }}
        >
          No workspaces yet
        </h2>

        {/* Description */}
        <p className="text-sm leading-relaxed mb-8 block mx-auto" style={{ color: 'var(--color-slate-text)' }}>
          Create your first workspace to get started. Workspaces help you organize your projects,
          clients, and invoices in one place.
        </p>

        {/* CTA */}
        <Button variant="primary" onClick={onCreateClick} className="flex items-center gap-2 mx-auto">
          <Plus size={16} />
          Create Workspace
        </Button>
      </div>
    </div>
  );
}
