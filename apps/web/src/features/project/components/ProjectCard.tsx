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
      className="p-6 rounded-[var(--radius-xl)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 cursor-pointer relative flex flex-col justify-between border border-[var(--color-hairline-soft)] border-t-4 border-t-[var(--color-brand-yellow)] bg-white group hover:-translate-y-1 space-y-4"
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

          <p className="text-xs font-medium text-[var(--color-slate-text,#64748b)] flex items-center gap-1.5 mt-1">
            <UserCheck className="h-3.5 w-3.5 text-amber-500" />
            <span>{project.clientName ? project.clientName : 'Internal Project'}</span>
          </p>
        </div>

        {/* Financial & Timeline Metrics */}
        <div className="space-y-2 text-xs text-[var(--color-slate-text,#64748b)] pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-gray-500 font-medium">
              <CurrencyDollar className="h-4 w-4 text-emerald-600" /> Budget
            </span>
            <span className="font-semibold text-gray-900">{formattedBudget}</span>
          </div>

          {project.targetDate && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                <CalendarBlank className="h-4 w-4 text-blue-500" /> Target Date
              </span>
              <span className="font-medium text-gray-800">{project.targetDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-100">
        <span className="text-[11px] font-semibold text-amber-600 group-hover:underline">
          View scope &rarr;
        </span>

        <div className="flex items-center gap-1.5">
          {!isArchived ? (
            confirmingArchive ? (
              <div
                className="flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs font-medium text-red-600 mr-1">
                  Archive?
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConfirmArchive}
                  disabled={isDeleting}
                  className="h-7 px-2 text-xs bg-red-600 text-white hover:bg-red-700 border-none"
                >
                  <Check className="h-3 w-3 mr-0.5" /> Yes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelArchive}
                  disabled={isDeleting}
                  className="h-7 px-2 text-xs"
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
                  className="h-7 px-2.5 text-xs rounded-xl"
                >
                  <PencilSimple className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleArchiveClick}
                  disabled={isDeleting}
                  className="h-7 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
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
              className="h-7 px-2.5 text-xs rounded-xl"
            >
              <ArrowClockwise className="h-3.5 w-3.5 mr-1" /> Restore
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
