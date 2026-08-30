'use client';

import { useState } from 'react';
import { Card, Button } from '@shared/components';
import {
  UserCheck,
  CalendarBlank,
  CurrencyDollar,
  PencilSimple,
  Archive,
  ArrowClockwise,
  Check,
  X,
  Tag,
} from '@phosphor-icons/react';
import type { ProjectResponse } from '../api';
import { useDeleteProject, useRestoreProject } from '../hooks';
import { ProjectStatusControl } from './ProjectStatusControl';

interface ProjectCardProps {
  workspaceId: string;
  project: ProjectResponse;
  onSelect?: (project: ProjectResponse) => void;
  onEdit?: (project: ProjectResponse) => void;
}

export function ProjectCard({
  workspaceId,
  project,
  onSelect,
  onEdit,
}: ProjectCardProps) {
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject(workspaceId);
  const { mutate: restoreProject, isPending: isRestoring } = useRestoreProject(workspaceId);

  const isArchived = project.status === 'archived' || Boolean(project.deletedAt);

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingArchive(true);
  };

  const handleConfirmArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProject(project.id, {
      onSettled: () => setConfirmingArchive(false),
    });
  };

  const handleCancelArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingArchive(false);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    restoreProject(project.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(project);
  };

  const formattedBudget = project.budgetAmount
    ? `${project.budgetCurrency || 'USD'} ${Number(project.budgetAmount).toLocaleString()}`
    : 'No budget set';

  return (
    <Card
      className="p-6 rounded-[var(--radius-xl)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 cursor-pointer relative flex flex-col justify-between border border-[var(--color-hairline-soft)] border-t-[3px] border-t-[var(--color-brand-yellow)] bg-white group hover:-translate-y-1 space-y-4"
      onClick={() => onSelect?.(project)}
    >
      <div className="space-y-3.5">
        {/* Header Status & Pricing Model */}
        <div className="flex items-center justify-between gap-2">
          <ProjectStatusControl
            workspaceId={workspaceId}
            projectId={project.id}
            currentStatus={project.status}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--color-surface-soft)] text-[var(--color-charcoal)] border border-[var(--color-hairline-soft)] flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {project.pricingModel}
          </span>
        </div>

        {/* Project Name & Client */}
        <div>
          <h3 className="font-bold text-[var(--color-ink-deep)] text-lg leading-snug group-hover:text-[var(--color-brand-blue)] transition-colors">
            {project.name}
          </h3>

          <p className="text-xs font-medium text-[var(--color-slate-text)] flex items-center gap-1.5 mt-1">
            <UserCheck className="h-3.5 w-3.5 text-[var(--color-yellow-dark)]" />
            <span>{project.clientName ? project.clientName : 'Internal Project'}</span>
          </p>
        </div>

        {/* Financial & Timeline Metrics */}
        <div className="space-y-2 text-xs text-[var(--color-slate-text)] pt-3 border-t border-[var(--color-hairline-soft)]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[var(--color-steel)] font-medium">
              <CurrencyDollar className="h-4 w-4 text-[var(--color-success-accent)]" /> Budget
            </span>
            <span className="font-semibold text-[var(--color-ink-deep)]">{formattedBudget}</span>
          </div>

          {project.targetDate && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[var(--color-steel)] font-medium">
                <CalendarBlank className="h-4 w-4 text-[var(--color-brand-blue)]" /> Target Date
              </span>
              <span className="font-medium text-[var(--color-charcoal)]">{project.targetDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-[var(--color-hairline-soft)]">
        <span className="text-[11px] font-semibold text-[var(--color-yellow-dark)] group-hover:underline transition-colors">
          View scope &rarr;
        </span>

        <div className="flex items-center gap-1.5">
          {!isArchived ? (
            confirmingArchive ? (
              <div
                className="flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs font-medium text-[var(--color-error)] mr-1">
                  Archive?
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConfirmArchive}
                  disabled={isDeleting}
                  className="h-7 px-2 text-xs bg-[var(--color-error)] text-white hover:opacity-90 border-none rounded-full"
                >
                  <Check className="h-3 w-3 mr-0.5" /> Yes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelArchive}
                  disabled={isDeleting}
                  className="h-7 px-2 text-xs rounded-full"
                >
                  <X className="h-3 w-3 mr-0.5" /> No
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEdit}
                  className="h-7 px-2.5 text-xs rounded-full"
                >
                  <PencilSimple className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleArchiveClick}
                  disabled={isDeleting}
                  className="h-7 px-2.5 text-xs text-[var(--color-error)] hover:text-white hover:bg-[var(--color-error)] rounded-full"
                >
                  <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                </Button>
              </>
            )
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRestore}
              disabled={isRestoring}
              className="h-7 px-2.5 text-xs rounded-full"
            >
              <ArrowClockwise className="h-3.5 w-3.5 mr-1" /> Restore
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
