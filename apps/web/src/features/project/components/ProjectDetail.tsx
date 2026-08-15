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
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-black transition-colors gap-2 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Projects</span>
        </button>

        <div className="flex items-center gap-2">
          {!isArchived ? (
            confirmingArchive ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-red-600 mr-1">Archive?</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConfirmArchive}
                  disabled={isDeleting}
                  className="h-8 px-2.5 text-xs bg-red-600 text-white hover:bg-red-700 border-none"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Yes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingArchive(false)}
                  disabled={isDeleting}
                  className="h-8 px-2.5 text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> No
                </Button>
              </div>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => onEdit(project)}>
                  <PencilSimple className="h-4 w-4 mr-1.5" /> Edit Project
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingArchive(true)}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Archive className="h-4 w-4 mr-1.5" /> Archive
                </Button>
              </>
            )
          ) : (
            <Button variant="secondary" size="sm" onClick={handleRestore} disabled={isRestoring}>
              <ArrowClockwise className="h-4 w-4 mr-1.5" /> Restore Project
            </Button>
          )}
        </div>
      </div>

      {/* Main Project Overview Card */}
      <Card className="p-6 sm:p-8 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] bg-white shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep,#0f172a)] tracking-tight">
                {project.name}
              </h1>
              <ProjectStatusControl
                workspaceId={workspaceId}
                projectId={project.id}
                currentStatus={project.status}
              />
            </div>
            <p className="text-sm font-medium text-[var(--color-slate-text,#64748b)] flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-amber-500" />
              <span>{project.clientName ? project.clientName : 'Internal Project'}</span>
              <span className="text-gray-300">•</span>
              <span className="capitalize font-semibold text-gray-700 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-gray-400" />
                {project.pricingModel} pricing
              </span>
            </p>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <CurrencyDollar className="h-4 w-4" />
              </div>
              <span>Financial Model</span>
            </div>
            <div className="text-xl font-bold text-gray-900 pt-1">{formattedBudget}</div>
            <div className="text-xs text-gray-600 capitalize">
              Billing structure: {project.pricingModel}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
            <div className="flex items-center gap-2 text-blue-800 text-xs font-bold uppercase tracking-wider">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <CalendarBlank className="h-4 w-4" />
              </div>
              <span>Target Completion</span>
            </div>
            <div className="text-xl font-bold text-gray-900 pt-1">
              {project.targetDate || 'Not set'}
            </div>
            <div className="text-xs text-gray-600">
              Start Date: {project.startDate || 'Not specified'}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
            <div className="flex items-center gap-2 text-purple-800 text-xs font-bold uppercase tracking-wider">
              <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                <Clock className="h-4 w-4" />
              </div>
              <span>Status Overview</span>
            </div>
            <div className="text-xl font-bold text-gray-900 capitalize pt-1">
              {project.status.replace('_', ' ')}
            </div>
            <div className="text-xs text-gray-600">
              Workspace ID: <span className="font-mono">{workspaceId.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Scope Description */}
        {project.description && (
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-bold text-[var(--color-ink-deep,#0f172a)] flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" /> Scope & Deliverables Overview
            </h4>
            <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-200 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {project.description}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
