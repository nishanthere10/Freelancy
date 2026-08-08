'use client';

/**
 * Workspace page header
 * Title, description, and create button
 */

import { Button } from '@shared/components';
import { Plus } from '@phosphor-icons/react';

interface WorkspaceHeaderProps {
  onCreateClick: () => void;
}

export function WorkspaceHeader({ onCreateClick }: WorkspaceHeaderProps) {
  return (
    <div className="mb-10 flex items-end justify-between">
      <div>
        <h1
          className="text-4xl font-medium leading-tight"
          style={{ color: 'var(--color-ink-deep)', letterSpacing: '-1px' }}
        >
          Workspaces
        </h1>
        <p className="mt-1 text-base" style={{ color: 'var(--color-slate-text)' }}>
          Manage your workspaces and projects
        </p>
      </div>

      <Button variant="primary" onClick={onCreateClick} className="flex items-center gap-2">
        <Plus size={16} />
        Create Workspace
      </Button>
    </div>
  );
}
