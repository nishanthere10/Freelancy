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
      {/* Page body */}
      <main className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12 py-10">


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
