'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  Circle,
  Clock,
  Plus,
  Trash,
  Hourglass,
  Receipt,
  Sparkle,
  SpinnerGap,
} from '@phosphor-icons/react';
import { Button } from '@shared/components/Button';
import { Dialog } from '@shared/components/Dialog';
import {
  useCreateProjectDeliverable,
  useDeleteProjectDeliverable,
  useUpdateProjectDeliverable,
  useBackfillProjectDeliverables,
} from '../hooks';
import type {
  DeliverableComplexity,
  DeliverableStatus,
  ProjectDeliverable,
} from '../api';

interface ProjectDeliverablesCardProps {
  workspaceId: string;
  projectId: string;
  deliverables: ProjectDeliverable[];
  hasLinkedScope?: boolean;
}

export const ProjectDeliverablesCard: React.FC<ProjectDeliverablesCardProps> = ({
  workspaceId,
  projectId,
  deliverables,
  hasLinkedScope = false,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newHours, setNewHours] = useState('8');
  const [newComplexity, setNewComplexity] = useState<DeliverableComplexity>('medium');

  const createMutation = useCreateProjectDeliverable(workspaceId, projectId);
  const updateMutation = useUpdateProjectDeliverable(workspaceId, projectId);
  const deleteMutation = useDeleteProjectDeliverable(workspaceId, projectId);
  const backfillMutation = useBackfillProjectDeliverables(workspaceId, projectId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createMutation.mutateAsync({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      estimatedHours: Number(newHours) || 0,
      complexity: newComplexity,
      position: deliverables.length + 1,
    });

    setNewTitle('');
    setNewDescription('');
    setNewHours('8');
    setNewComplexity('medium');
    setIsAddOpen(false);
  };

  const handleStatusChange = (deliverable: ProjectDeliverable, newStatus: DeliverableStatus) => {
    updateMutation.mutate({
      deliverableId: deliverable.id,
      data: { status: newStatus },
    });
  };

  const handleLogHours = (deliverable: ProjectDeliverable, deltaHours: number) => {
    const current = Number(deliverable.loggedHours || 0);
    const updated = Math.max(0, current + deltaHours);
    updateMutation.mutate({
      deliverableId: deliverable.id,
      data: { loggedHours: updated.toFixed(2) },
    });
  };

  const getStatusBadge = (status: DeliverableStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-teal-light)] text-[var(--color-brand-teal)] border border-[var(--color-brand-teal)]/20">
            <CheckCircle className="h-3.5 w-3.5" weight="fill" /> Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] border border-[var(--color-brand-blue)]/20">
            <Hourglass className="h-3.5 w-3.5" weight="bold" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-surface-soft)] text-[var(--color-slate-text)] border border-[var(--color-hairline-soft)]">
            <Circle className="h-3.5 w-3.5" weight="bold" /> Pending
          </span>
        );
    }
  };

  const getComplexityBadge = (complexity: DeliverableComplexity) => {
    switch (complexity) {
      case 'high':
        return (
          <span className="text-[11px] font-bold text-[var(--color-error)] bg-[var(--color-error-bg)] px-2 py-0.5 rounded-md border border-[var(--color-error-border)]">
            High complexity
          </span>
        );
      case 'low':
        return (
          <span className="text-[11px] font-bold text-[var(--color-moss-dark)] bg-[var(--color-teal-light)] px-2 py-0.5 rounded-md border border-[var(--color-brand-teal)]/20">
            Low complexity
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-[var(--color-yellow-dark)] bg-[var(--color-yellow-light)] px-2 py-0.5 rounded-md border border-[var(--color-brand-yellow)]/30">
            Medium complexity
          </span>
        );
    }
  };

  return (
    <div className="rounded-[var(--radius-xl)] bg-white border border-[var(--color-hairline-soft)] shadow-[var(--shadow-card)] p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-hairline-soft)]">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-ink-deep)] flex items-center gap-2">
            <span>Project Deliverables & Milestones</span>
            <span className="text-xs px-2 py-0.5 font-mono font-bold bg-[var(--color-surface-soft)] text-[var(--color-charcoal)] rounded-full">
              {deliverables.length}
            </span>
          </h2>
          <p className="text-xs text-[var(--color-slate-text)] mt-0.5">
            Operational work items derived from your confirmed Scope Studio baseline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {deliverables.length === 0 && hasLinkedScope && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
              className="rounded-full text-xs font-semibold gap-1.5"
            >
              {backfillMutation.isPending ? (
                <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkle className="h-3.5 w-3.5 text-[var(--color-yellow-dark)]" />
              )}
              Import from Confirmed Scope
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="rounded-full text-xs font-semibold gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" weight="bold" /> Add Deliverable
          </Button>
        </div>
      </div>

      {/* Deliverables List */}
      {deliverables.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-surface-soft)] flex items-center justify-center text-[var(--color-slate-text)]">
            <Hourglass className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-ink-deep)]">
            No operational deliverables found
          </p>
          <p className="text-xs text-[var(--color-slate-text)] max-w-sm mx-auto">
            {hasLinkedScope
              ? 'This project has a confirmed AI scope. Click "Import from Confirmed Scope" to materialize your deliverables.'
              : 'Add custom deliverables or convert an AI scope to populate your project execution checklist.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map((d, index) => {
            const isCompleted = d.status === 'completed';
            const isBilled = Boolean(d.billedAt);

            return (
              <div
                key={d.id}
                className={`p-4 sm:p-5 rounded-[var(--radius-lg)] border transition-all duration-200 space-y-3 ${
                  isCompleted
                    ? 'bg-[var(--color-teal-light)]/20 border-[var(--color-brand-teal)]/30'
                    : 'bg-white border-[var(--color-hairline-soft)] hover:border-[var(--color-brand-yellow)]/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[var(--color-stone)]">
                        #{index + 1}
                      </span>
                      <h4 className="text-sm font-bold text-[var(--color-ink-deep)] break-words">
                        {d.title}
                      </h4>
                      {getStatusBadge(d.status)}
                      {getComplexityBadge(d.complexity)}
                      {isBilled && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-brand-teal)] bg-white px-2 py-0.5 rounded-full border border-[var(--color-brand-teal)]/30">
                          <Receipt className="h-3 w-3" /> Billed
                        </span>
                      )}
                    </div>

                    {d.description && (
                      <p className="text-xs text-[var(--color-charcoal)] leading-relaxed line-clamp-2">
                        {d.description}
                      </p>
                    )}
                  </div>

                  {/* Actions & Hours */}
                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <div className="text-right text-xs">
                      <span className="font-mono font-bold text-[var(--color-ink-deep)]">
                        {d.loggedHours}h
                      </span>
                      <span className="text-[var(--color-slate-text)] font-mono">
                        {' '}
                        / {d.estimatedHours}h
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(d.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded-md text-[var(--color-stone)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
                      title="Delete deliverable"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Bottom Interactive Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-hairline-soft)] text-xs">
                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium text-[var(--color-slate-text)] mr-1">
                      Status:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(d, 'pending')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        d.status === 'pending'
                          ? 'bg-[var(--color-charcoal)] text-white'
                          : 'bg-[var(--color-surface-soft)] text-[var(--color-charcoal)] hover:bg-[var(--color-hairline)]'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(d, 'in_progress')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        d.status === 'in_progress'
                          ? 'bg-[var(--color-brand-blue)] text-white'
                          : 'bg-[var(--color-surface-soft)] text-[var(--color-charcoal)] hover:bg-[var(--color-hairline)]'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(d, 'completed')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        d.status === 'completed'
                          ? 'bg-[var(--color-brand-teal)] text-white'
                          : 'bg-[var(--color-surface-soft)] text-[var(--color-charcoal)] hover:bg-[var(--color-hairline)]'
                      }`}
                    >
                      Completed
                    </button>
                  </div>

                  {/* Hours Logger Quick Controls */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[var(--color-slate-text)] flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Log:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLogHours(d, 0.5)}
                      className="px-1.5 py-0.5 rounded bg-[var(--color-surface-soft)] hover:bg-[var(--color-yellow-light)] text-[11px] font-mono font-bold text-[var(--color-ink-deep)] transition-colors"
                      title="Log +0.5h"
                    >
                      +0.5h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogHours(d, 1.0)}
                      className="px-1.5 py-0.5 rounded bg-[var(--color-surface-soft)] hover:bg-[var(--color-yellow-light)] text-[11px] font-mono font-bold text-[var(--color-ink-deep)] transition-colors"
                      title="Log +1.0h"
                    >
                      +1.0h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogHours(d, 2.0)}
                      className="px-1.5 py-0.5 rounded bg-[var(--color-surface-soft)] hover:bg-[var(--color-yellow-light)] text-[11px] font-mono font-bold text-[var(--color-ink-deep)] transition-colors"
                      title="Log +2.0h"
                    >
                      +2.0h
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Deliverable Dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Add Project Deliverable"
        description="Define a new deliverable or milestone to execute inside this project."
        className="max-w-md p-6 rounded-[var(--radius-feature)] shadow-[var(--shadow-modal)]"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-[var(--color-ink-deep)] mb-1">
              Deliverable Title <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Set up OAuth Authentication"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-hairline)] focus:outline-none focus:border-[var(--color-brand-yellow)] font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-ink-deep)] mb-1">
              Description / Requirements
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Provide context or acceptance criteria..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-hairline)] focus:outline-none focus:border-[var(--color-brand-yellow)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--color-ink-deep)] mb-1">
                Estimated Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-hairline)] focus:outline-none focus:border-[var(--color-brand-yellow)] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-ink-deep)] mb-1">
                Complexity
              </label>
              <select
                value={newComplexity}
                onChange={(e) => setNewComplexity(e.target.value as DeliverableComplexity)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-hairline)] focus:outline-none focus:border-[var(--color-brand-yellow)]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-hairline-soft)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createMutation.isPending || !newTitle.trim()}
            >
              {createMutation.isPending ? 'Adding...' : 'Create Deliverable'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
