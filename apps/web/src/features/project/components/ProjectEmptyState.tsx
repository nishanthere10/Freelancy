'use client';

import { Button } from '@shared/components';
import { Briefcase, Plus } from '@phosphor-icons/react';

interface ProjectEmptyStateProps {
  onCreateClick?: () => void;
}

export function ProjectEmptyState({ onCreateClick }: ProjectEmptyStateProps) {
  return (
    <div className="text-center py-16 px-8 border-2 border-dashed border-[var(--color-hairline)] rounded-[var(--radius-xxxl)] bg-[var(--color-canvas)] shadow-[var(--shadow-subtle)] space-y-5 max-w-xl mx-auto my-8">
      <div className="h-16 w-16 bg-[var(--color-yellow-light)] rounded-[var(--radius-xl)] flex items-center justify-center mx-auto text-[var(--color-yellow-dark)]">
        <Briefcase className="h-8 w-8" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-[var(--color-ink-deep)] tracking-tight">
          No projects yet
        </h3>
        <p className="text-sm text-[var(--color-slate-text)] max-w-md mx-auto leading-relaxed">
          Create your first project to track client deliverables, budgets, and deadlines.
        </p>
      </div>
      {onCreateClick && (
        <Button onClick={onCreateClick} className="rounded-full shadow-xs">
          <Plus className="h-4 w-4 mr-2" /> Add Project
        </Button>
      )}
    </div>
  );
}
