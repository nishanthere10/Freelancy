'use client';

import { Card, Button } from '@shared/components';
import { ArrowLeft, UserCheck, CalendarBlank, CurrencyInr, PencilSimple, Archive, Briefcase } from '@phosphor-icons/react';
import type { ProjectResponse } from '../api';
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
  const formattedBudget = project.budgetAmount
    ? `${project.budgetCurrency || 'INR'} ${Number(project.budgetAmount).toLocaleString()}`
    : 'Not specified';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Projects
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit(project)}>
            <PencilSimple className="h-4 w-4 mr-1.5" /> Edit Project
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-hairline)]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[var(--color-ink-deep)]">
                {project.name}
              </h1>
              <ProjectStatusControl
                workspaceId={workspaceId}
                projectId={project.id}
                currentStatus={project.status}
              />
            </div>
            <p className="text-sm text-[var(--color-slate-text)] flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-gray-400" />
              <span>{project.clientName ? project.clientName : 'Internal Project'}</span>
              <span className="text-gray-300">•</span>
              <span className="capitalize font-medium text-gray-600">{project.pricingModel} pricing</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <CurrencyInr className="h-4 w-4 text-emerald-600" /> Financials
            </h4>
            <div className="text-sm">
              <span className="text-gray-500">Budget: </span>
              <span className="font-semibold text-gray-900">{formattedBudget}</span>
            </div>
            <div className="text-xs text-gray-500 capitalize">
              Pricing structure: {project.pricingModel}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <CalendarBlank className="h-4 w-4 text-blue-600" /> Timeline
            </h4>
            <div className="text-sm">
              <span className="text-gray-500">Start Date: </span>
              <span className="font-medium text-gray-900">{project.startDate || 'Not set'}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Target Date: </span>
              <span className="font-medium text-gray-900">{project.targetDate || 'Not set'}</span>
            </div>
          </div>
        </div>

        {project.description && (
          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-semibold text-[var(--color-ink-deep)] flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-gray-500" /> Scope Overview
            </h4>
            <div className="p-4 rounded-xl bg-white border border-[var(--color-hairline)] text-sm text-[var(--color-slate-text)] whitespace-pre-wrap">
              {project.description}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
