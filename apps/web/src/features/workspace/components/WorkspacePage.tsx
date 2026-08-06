'use client';

/**
 * Workspace landing page
 * Lists user's workspaces or shows empty state
 * Entry point for workspace management
 */

import { useState } from 'react';
import { useWorkspaces } from '../hooks';
import type { WorkspaceResponse } from '../api';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import { EditWorkspaceDialog } from './EditWorkspaceDialog';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { WorkspaceGrid } from './WorkspaceGrid';
import { WorkspaceHeader } from './WorkspaceHeader';

export function WorkspacePage() {
  const { data: workspaces, isLoading, error } = useWorkspaces();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceResponse | null>(null);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-canvas)]">
        <div className="text-center max-w-sm">
          <div
            className="mx-auto mb-4 h-12 w-12 rounded-[var(--radius-full)] flex items-center justify-center"
            style={{ background: 'var(--color-error-bg)' }}
          >
            <span className="text-xl">!</span>
          </div>
          <h1 className="text-xl font-medium text-[var(--color-ink-deep)] mb-2">
            Error loading workspaces
          </h1>
          <p className="text-sm text-[var(--color-slate-text)]">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const isEmpty = !isLoading && (!workspaces || workspaces.length === 0);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      {/* Top nav bar */}
      <header
        className="sticky top-0 z-40 border-b border-[var(--color-hairline)]"
        style={{ background: 'var(--color-canvas)' }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand mark */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center h-8 w-8 rounded-[var(--radius-sm)] text-xs font-semibold"
              style={{
                background: 'var(--color-brand-yellow)',
                color: 'var(--color-primary)',
              }}
            >
              F
            </span>
            <span className="text-sm font-medium text-[var(--color-ink-deep)]">Freelance OS</span>
          </div>
        </div>
      </header>

      {/* Page body */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <WorkspaceHeader onCreateClick={() => setCreateDialogOpen(true)} />

        {isEmpty ? (
          <WorkspaceEmptyState onCreateClick={() => setCreateDialogOpen(true)} />
        ) : (
          <WorkspaceGrid
            workspaces={workspaces || []}
            isLoading={isLoading}
            onEditWorkspace={setEditingWorkspace}
          />
        )}
      </main>

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      <EditWorkspaceDialog
        workspace={editingWorkspace}
        open={!!editingWorkspace}
        onOpenChange={(open) => !open && setEditingWorkspace(null)}
      />
    </div>
  );
}
