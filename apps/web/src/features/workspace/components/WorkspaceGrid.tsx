'use client';

/**
 * Workspace grid layout
 * Displays workspace cards in responsive grid with skeleton loading state
 */

import { Skeleton } from '@shared/components';
import type { WorkspaceResponse } from '../api';
import { WorkspaceCard } from './WorkspaceCard';

interface WorkspaceGridProps {
  workspaces: WorkspaceResponse[];
  isLoading?: boolean;
  onEditWorkspace?: (workspace: WorkspaceResponse) => void;
}

export function WorkspaceGrid({ workspaces, isLoading, onEditWorkspace }: WorkspaceGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onEdit={onEditWorkspace}
        />
      ))}
    </div>
  );
}
