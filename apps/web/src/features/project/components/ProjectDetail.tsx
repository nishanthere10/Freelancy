'use client';

import { useState } from 'react';
import { Card, Button } from '@shared/components';
import {
  ArrowLeft,
  UserCheck,
  CalendarBlank,
  CurrencyDollar,
  PencilSimple,
  Archive,
  ArrowClockwise,
  Check,
  X,
  Tag,
  Clock,
  FileText,
} from '@phosphor-icons/react';
import type { ProjectResponse } from '../api';
import { useDeleteProject, useRestoreProject } from '../hooks';
import { ProjectStatusControl } from './ProjectStatusControl';

interface ProjectDetailProps {
  workspaceId: string;
  project: ProjectResponse;
  onBack: () => void;
  onEdit: (project: ProjectResponse) => void;
}

export function ProjectDetail({
  workspaceId,
  project,
  onBack,
  onEdit,
}: ProjectDetailProps) {
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject(workspaceId);
  const { mutate: restoreProject, isPending: isRestoring } = useRestoreProject(workspaceId);

  const isArchived = project.status === 'archived' || Boolean(project.deletedAt);

  const handleConfirmArchive = () => {
    deleteProject(project.id, {
      onSuccess: () => {
        setConfirmingArchive(false);
        onBack();
      },
      onSettled: () => setConfirmingArchive(false),
    });
  };

  const handleRestore = () => {
    restoreProject(project.id);
  };

  const formattedBudget = project.budgetAmount
    ? `${project.budgetCurrency || 'USD'} ${Number(project.budgetAmount).toLocaleString()}`
    : 'Not specified';

  return (
    <div className="space-y-6 max-w-[1200px] w-full mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-[var(--color-slate-text)] hover:text-[var(--color-ink-deep)] transition-colors gap-2 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Projects</span>
        </button>

        <div className="flex items-center gap-2">
          {!isArchived ? (
            confirmingArchive ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--color-error)] mr-1">Archive?</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConfirmArchive}
                  disabled={isDeleting}
                  className="h-8 px-3 text-xs bg-[var(--color-error)] text-white hover:opacity-90 border-none rounded-full"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Yes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingArchive(false)}
                  disabled={isDeleting}
                  className="h-8 px-3 text-xs rounded-full"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> No
                </Button>
              </div>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => onEdit(project)} className="rounded-full">
                  <PencilSimple className="h-4 w-4 mr-1.5" /> Edit Project
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingArchive(true)}
                  disabled={isDeleting}
                  className="text-[var(--color-error)] hover:text-white hover:bg-[var(--color-error)] rounded-full"
                >
                  <Archive className="h-4 w-4 mr-1.5" /> Archive
                </Button>
              </>
            )
          ) : (
            <Button variant="secondary" size="sm" onClick={handleRestore} disabled={isRestoring} className="rounded-full">
              <ArrowClockwise className="h-4 w-4 mr-1.5" /> Restore Project
            </Button>
          )}
        </div>
      </div>

      {/* Main Project Overview Card */}
      <Card className="p-6 sm:p-8 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] border-t-[3px] border-t-[var(--color-brand-yellow)] bg-white shadow-[var(--shadow-card)] space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-hairline-soft)]">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep)] tracking-tight">
                {project.name}
              </h1>
              <ProjectStatusControl
                workspaceId={workspaceId}
                projectId={project.id}
                currentStatus={project.status}
              />
            </div>
            <p className="text-sm font-medium text-[var(--color-slate-text)] flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[var(--color-yellow-dark)]" />
              <span>{project.clientName ? project.clientName : 'Internal Project'}</span>
              <span className="text-[var(--color-stone)]">•</span>
              <span className="capitalize font-semibold text-[var(--color-charcoal)] flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-[var(--color-stone)]" />
                {project.pricingModel} pricing
              </span>
            </p>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--color-teal-light)] border border-[var(--color-brand-teal)]/20 space-y-2">
            <div className="flex items-center gap-2 text-[var(--color-moss-dark)] text-xs font-bold uppercase tracking-wider">
              <div className="p-1.5 rounded-[var(--radius-md)] bg-white text-[var(--color-brand-teal)] shadow-xs">
                <CurrencyDollar className="h-4 w-4" />
              </div>
              <span>Financial Model</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-ink-deep)] pt-1">{formattedBudget}</div>
            <div className="text-xs text-[var(--color-charcoal)] capitalize">
              Billing structure: {project.pricingModel}
            </div>
          </div>

          <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--color-surface-pricing-featured)] border border-[var(--color-brand-blue)]/20 space-y-2">
            <div className="flex items-center gap-2 text-[var(--color-brand-blue)] text-xs font-bold uppercase tracking-wider">
              <div className="p-1.5 rounded-[var(--radius-md)] bg-white text-[var(--color-brand-blue)] shadow-xs">
                <CalendarBlank className="h-4 w-4" />
              </div>
              <span>Target Completion</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-ink-deep)] pt-1">
              {project.targetDate || 'Not set'}
            </div>
            <div className="text-xs text-[var(--color-charcoal)]">
              Start Date: {project.startDate || 'Not specified'}
            </div>
          </div>

          <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--color-yellow-light)] border border-[var(--color-brand-yellow)]/30 space-y-2">
            <div className="flex items-center gap-2 text-[var(--color-yellow-dark)] text-xs font-bold uppercase tracking-wider">
              <div className="p-1.5 rounded-[var(--radius-md)] bg-white text-[var(--color-yellow-dark)] shadow-xs">
                <Clock className="h-4 w-4" />
              </div>
              <span>Status Overview</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-ink-deep)] capitalize pt-1">
              {project.status.replace('_', ' ')}
            </div>
            <div className="text-xs text-[var(--color-charcoal)]">
              Workspace ID: <span className="font-mono">{workspaceId.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Scope Description */}
        {project.description && (
          <div className="space-y-3 pt-4 border-t border-[var(--color-hairline-soft)]">
            <h4 className="text-sm font-bold text-[var(--color-ink-deep)] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--color-yellow-dark)]" /> Scope & Deliverables Overview
            </h4>
            <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-sm text-[var(--color-charcoal)] leading-relaxed whitespace-pre-wrap">
              {project.description}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
