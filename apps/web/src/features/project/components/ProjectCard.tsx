'use client';

import { useState } from 'react';
import { Card, Button } from '@shared/components';
import { UserCheck, CalendarBlank, CurrencyInr, PencilSimple, Archive, ArrowClockwise, Check, X } from '@phosphor-icons/react';
import type { ProjectResponse } from '../api';
import { useDeleteProject, useRestoreProject } from '../hooks';
import { ProjectStatusControl } from './ProjectStatusControl';

interface ProjectCardProps {
  workspaceId: string;
  project: ProjectResponse;
  onSelect?: (project: ProjectResponse) => void;
  onEdit?: (project: ProjectResponse) => void;
}

export function ProjectCard({ workspaceId, project, onSelect, onEdit }: ProjectCardProps) {
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
    ? `${project.budgetCurrency || 'INR'} ${Number(project.budgetAmount).toLocaleString()}`
    : 'No budget set';

  return (
    <Card
      className="p-5 hover:shadow-md transition-shadow cursor-pointer relative flex flex-col justify-between"
      onClick={() => onSelect?.(project)}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <ProjectStatusControl
            workspaceId={workspaceId}
            projectId={project.id}
            currentStatus={project.status}
          />
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 capitalize">
            {project.pricingModel}
          </span>
        </div>

        <h3 className="font-semibold text-[var(--color-ink-deep)] text-base leading-tight mb-1">
          {project.name}
        </h3>

        <p className="text-xs text-[var(--color-slate-text)] flex items-center gap-1 mb-3">
          <UserCheck className="h-3.5 w-3.5 text-gray-400" />
          <span>{project.clientName ? project.clientName : 'Internal Project'}</span>
        </p>

        <div className="space-y-1.5 text-xs text-[var(--color-slate-text)] py-2 border-t border-[var(--color-hairline)]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-gray-500">
              <CurrencyInr className="h-3.5 w-3.5" /> Budget
            </span>
            <span className="font-medium text-[var(--color-ink-deep)]">{formattedBudget}</span>
          </div>

          {project.targetDate && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-500">
                <CalendarBlank className="h-3.5 w-3.5" /> Target Date
              </span>
              <span className="font-medium text-gray-700">{project.targetDate}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-hairline)] mt-3">
        {!isArchived ? (
          confirmingArchive ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-medium text-red-600 mr-1">Archive?</span>
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
                className="h-8 px-2.5 text-xs"
              >
                <PencilSimple className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleArchiveClick}
                disabled={isDeleting}
                className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
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
            className="h-8 px-2.5 text-xs"
          >
            <ArrowClockwise className="h-3.5 w-3.5 mr-1" /> Restore
          </Button>
        )}
      </div>
    </Card>
  );
}

