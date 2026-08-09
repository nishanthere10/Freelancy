'use client';

import { Button } from '@shared/components';
import { Briefcase, Plus } from '@phosphor-icons/react';

interface ProjectEmptyStateProps {
  onCreateClick?: () => void;
}

export function ProjectEmptyState({ onCreateClick }: ProjectEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
      <div className="h-16 w-16 rounded-full bg-[var(--color-brand-yellow)] text-black flex items-center justify-center mb-4">
        <Briefcase className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-ink-deep)] mb-1">
        No projects yet
      </h3>
      <p className="text-sm text-[var(--color-slate-text)] max-w-md mb-6">
        Create your first project to track client deliverables, budgets, and deadlines.
      </p>
      {onCreateClick && (
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" /> Add Project
        </Button>
      )}
    </div>
  );
}
