'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowCounterClockwise,
  CalendarBlank,
  CheckCircle,
  Clock,
  Code,
  FloppyDisk,
  FolderOpen,
  FolderPlus,
  Plus,
  Sparkle,
  SpinnerGap,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { ScopeAnalysisRecord, ScopeAnalysisResult, ScopeDeliverable } from '@api/ai';
import { Button } from '@shared/components/Button';
import { useRefineScope, useUpdateScopeResult } from '../hooks/useScopeRefinement';
import { ConvertScopeModal } from './ConvertScopeModal';

interface ScopeReviewDraftProps {
  scopeRecord: ScopeAnalysisRecord;
  workspaceId?: string;
  onConfirm: () => void;
  onDiscard: () => void;
  isConfirming: boolean;
  onScopeUpdated?: (updatedRecord: ScopeAnalysisRecord) => void;
}

export const ScopeReviewDraft: React.FC<ScopeReviewDraftProps> = ({
  scopeRecord,
  workspaceId: propWorkspaceId,
  onConfirm,
  onDiscard,
  isConfirming,
  onScopeUpdated,
}) => {
  const workspaceId = propWorkspaceId || scopeRecord.workspaceId;
  const isConfirmed = Boolean(scopeRecord.confirmedAt);
  const isLinkedToProject = Boolean(scopeRecord.projectId);

  // Local editable state for deliverables & summary
  const [localResult, setLocalResult] = useState<ScopeAnalysisResult>(scopeRecord.result);
  const [isDirty, setIsDirty] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Mutations
  const refineMutation = useRefineScope(workspaceId);
  const updateResultMutation = useUpdateScopeResult(workspaceId);

  // Synchronize when switching to a different scope analysis record
  const [prevScopeId, setPrevScopeId] = useState(scopeRecord.id);
  if (scopeRecord.id !== prevScopeId) {
    setPrevScopeId(scopeRecord.id);
    setLocalResult(scopeRecord.result);
    setIsDirty(false);
  }

  // Dynamic calculations from current local state
  const totalHours = useMemo(() => {
    return localResult?.deliverables?.reduce(
      (acc: number, curr: ScopeDeliverable) => acc + (Number(curr.estimated_hours) || 0),
      0
    ) || 0;
  }, [localResult?.deliverables]);

  const calculatedWeeks = useMemo(() => {
    return Math.max(1, Math.round(totalHours / 35));
  }, [totalHours]);

  const displayWeeks = isDirty ? calculatedWeeks : (localResult?.timeline_weeks ?? calculatedWeeks);

  // Handle deliverable field changes with real-time recalculation
  const handleDeliverableChange = (
    index: number,
    field: keyof ScopeDeliverable,
    value: unknown
  ) => {
    setLocalResult((prev) => {
      const updated = [...(prev.deliverables || [])];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      const updatedTotalHours = updated.reduce(
        (acc: number, curr: ScopeDeliverable) => acc + (Number(curr.estimated_hours) || 0),
        0
      );
      const newWeeks = Math.max(1, Math.round(updatedTotalHours / 35));
      return {
        ...prev,
        deliverables: updated,
        timeline_weeks: newWeeks,
      };
    });
    setIsDirty(true);
  };

  // Add new deliverable
  const handleAddDeliverable = () => {
    setLocalResult((prev) => {
      const newDeliverable: ScopeDeliverable = {
        title: 'New Milestone / Deliverable',
        description: 'Detail the tasks, architecture, and deliverables for this milestone.',
        estimated_hours: 12,
        complexity: 'medium',
        skills_required: [],
      };
      const updated = [...(prev.deliverables || []), newDeliverable];
      const updatedTotalHours = updated.reduce(
        (acc: number, curr: ScopeDeliverable) => acc + (Number(curr.estimated_hours) || 0),
        0
      );
      return {
        ...prev,
        deliverables: updated,
        timeline_weeks: Math.max(1, Math.round(updatedTotalHours / 35)),
      };
    });
    setIsDirty(true);
  };

  // Remove deliverable
  const handleRemoveDeliverable = (index: number) => {
    if ((localResult?.deliverables?.length || 0) <= 1) {
      toast.error('Scope must have at least one deliverable');
      return;
    }
    setLocalResult((prev) => {
      const updated = prev.deliverables.filter((_, idx) => idx !== index);
      const updatedTotalHours = updated.reduce(
        (acc: number, curr: ScopeDeliverable) => acc + (Number(curr.estimated_hours) || 0),
        0
      );
      return {
        ...prev,
        deliverables: updated,
        timeline_weeks: Math.max(1, Math.round(updatedTotalHours / 35)),
      };
    });
    setIsDirty(true);
  };

  // Remove a skill tag from a deliverable
  const handleRemoveSkill = (deliverableIdx: number, skillIdx: number) => {
    setLocalResult((prev) => {
      const updated = [...(prev.deliverables || [])];
      const currentSkills = updated[deliverableIdx]?.skills_required || [];
      updated[deliverableIdx] = {
        ...updated[deliverableIdx],
        skills_required: currentSkills.filter((_, sIdx) => sIdx !== skillIdx),
      };
      return {
        ...prev,
        deliverables: updated,
      };
    });
    setIsDirty(true);
  };

  // Add a skill tag to a deliverable
  const handleAddSkill = (deliverableIdx: number, skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    setLocalResult((prev) => {
      const updated = [...(prev.deliverables || [])];
      const currentSkills = updated[deliverableIdx]?.skills_required || [];
      if (currentSkills.includes(trimmed)) return prev;
      updated[deliverableIdx] = {
        ...updated[deliverableIdx],
        skills_required: [...currentSkills, trimmed],
      };
      return {
        ...prev,
        deliverables: updated,
      };
    });
    setIsDirty(true);
  };

  // Save manual edits
  const handleSaveManualEdits = async () => {
    try {
      const updated = await updateResultMutation.mutateAsync({
        scopeId: scopeRecord.id,
        result: {
          ...localResult,
          timeline_weeks: calculatedWeeks,
        },
      });
      setIsDirty(false);
      toast.success('Deliverable edits saved successfully!');
      if (onScopeUpdated) {
        onScopeUpdated(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save edits';
      toast.error(msg);
    }
  };

  const handleOpenConvert = async () => {
    if (isDirty) {
      try {
        const updated = await updateResultMutation.mutateAsync({
          scopeId: scopeRecord.id,
          result: {
            ...localResult,
            timeline_weeks: calculatedWeeks,
          },
        });
        setIsDirty(false);
        if (onScopeUpdated) {
          onScopeUpdated(updated);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save changes before converting';
        toast.error(msg);
        return;
      }
    }
    setIsConvertModalOpen(true);
  };

  // Handle Conversational Refinement
  const handleRefineSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!revisionPrompt.trim() || revisionPrompt.trim().length < 5) {
      toast.error('Please enter a revision request of at least 5 characters');
      return;
    }

    try {
      const refined = await refineMutation.mutateAsync({
        scopeId: scopeRecord.id,
        revisionPrompt: revisionPrompt.trim(),
      });
      setLocalResult(refined.result);
      setIsDirty(false);
      setRevisionPrompt('');
      toast.success('Scope refined with AI successfully!');
      if (onScopeUpdated) {
        onScopeUpdated(refined);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refine scope';
      toast.error(msg);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setRevisionPrompt(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Card */}
      <div className="rounded-[var(--radius-xxl)] border border-[var(--color-hairline-soft)] bg-white p-5 sm:p-6 shadow-[var(--shadow-card)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-hairline-soft)] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] border border-[var(--color-brand-yellow)]/30 shadow-xs">
              <Sparkle size={18} weight="fill" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[var(--color-ink-deep)] tracking-tight">
                AI Scope Studio
              </h3>
              <p className="text-xs text-[var(--color-slate-text)]">
                Generated {new Date(scopeRecord.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLinkedToProject ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-teal-light)] px-3 py-1 text-xs font-semibold text-[var(--color-moss-dark)] border border-[var(--color-brand-teal)]/30">
                <CheckCircle size={14} weight="fill" />
                Linked to Live Project
              </span>
            ) : isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-teal-light)] px-3 py-1 text-xs font-semibold text-[var(--color-moss-dark)] border border-[var(--color-brand-teal)]/30">
                <CheckCircle size={14} weight="fill" />
                Confirmed Scope
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-yellow-light)] px-3 py-1 text-xs font-semibold text-[var(--color-yellow-dark)] border border-[var(--color-brand-yellow)]/40">
                <Clock size={14} weight="fill" />
                Draft (Editable)
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-pricing-featured)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-blue)] border border-[var(--color-brand-blue)]/20">
              {localResult?.confidence_score || 90}% Confidence
            </span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="rounded-[var(--radius-xl)] bg-[var(--color-surface-soft)] border border-[var(--color-hairline-soft)] p-4 text-sm leading-relaxed text-[var(--color-ink)]">
          {localResult?.summary}
        </div>

        {/* High Level Metrics Grid (Dynamically Calculated) */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-[var(--color-slate-text)]">
              <Clock size={16} className="text-[var(--color-brand-blue)]" />
              <span className="text-xs font-semibold uppercase tracking-wider">Estimated Work</span>
            </div>
            <p className="mt-1.5 text-2xl font-bold text-[var(--color-ink-deep)] tracking-tight">
              {totalHours} hrs
            </p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-[var(--color-slate-text)]">
              <CalendarBlank size={16} className="text-[var(--color-yellow-dark)]" />
              <span className="text-xs font-semibold uppercase tracking-wider">Duration</span>
            </div>
            <p className="mt-1.5 text-2xl font-bold text-[var(--color-ink-deep)] tracking-tight">
              {displayWeeks} {displayWeeks === 1 ? 'week' : 'weeks'}
            </p>
          </div>

          <div className="col-span-2 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-white p-4 sm:col-span-1 shadow-xs">
            <div className="flex items-center gap-2 text-[var(--color-slate-text)]">
              <CheckCircle size={16} className="text-[var(--color-moss-dark)]" />
              <span className="text-xs font-semibold uppercase tracking-wider">Milestones</span>
            </div>
            <p className="mt-1.5 text-2xl font-bold text-[var(--color-ink-deep)] tracking-tight">
              {localResult?.deliverables?.length || 0} items
            </p>
          </div>
        </div>
      </div>

      {/* Conversational "Refine with AI" Bar */}
      <div className="rounded-[var(--radius-xxl)] border border-[var(--color-brand-blue)]/25 bg-[var(--color-surface-soft)]/70 p-4 sm:p-5 shadow-[var(--shadow-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-deep)]">
            <Sparkle size={16} className="text-[var(--color-brand-blue)]" weight="fill" />
            <span>Refine Scope with AI</span>
          </div>
          <span className="text-[11px] text-[var(--color-slate-text)] hidden sm:inline">
            Groq LLaMA 3.3 70B
          </span>
        </div>

        <form onSubmit={handleRefineSubmit} className="flex gap-2">
          <input
            type="text"
            value={revisionPrompt}
            onChange={(e) => setRevisionPrompt(e.target.value)}
            disabled={refineMutation.isPending}
            placeholder="e.g. 'Shift stack to React Native, remove backend scope, and cap timeline at 3 weeks'..."
            className="flex-1 h-11 rounded-[var(--radius-lg)] border border-[var(--color-hairline-strong)] bg-white px-4 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-steel)] focus:outline-none focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[var(--color-brand-blue)]/20 shadow-xs"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={refineMutation.isPending || !revisionPrompt.trim()}
            className="rounded-[var(--radius-lg)] shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            {refineMutation.isPending ? (
              <>
                <SpinnerGap size={16} className="animate-spin text-[var(--color-brand-yellow)]" />
                <span className="hidden sm:inline">Refining...</span>
              </>
            ) : (
              <>
                <Sparkle size={16} weight="bold" className="text-[var(--color-brand-yellow)]" />
                <span>Refine</span>
              </>
            )}
          </Button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-[var(--color-slate-text)] mr-1">
            Suggestions:
          </span>
          {[
            'Add automated Playwright testing',
            'Focus on mobile app MVP',
            'Tighten timeline to 3 weeks',
            'Add Stripe payment gateway',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleQuickPrompt(prompt)}
              className="rounded-full bg-white border border-[var(--color-hairline-soft)] px-2.5 py-1 text-[11px] text-[var(--color-charcoal)] hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] transition-colors shadow-2xs"
            >
              + {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Deliverable Milestones Section (Interactive & Editable) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
            Deliverable Milestones ({localResult?.deliverables?.length || 0})
          </h4>
          {isDirty && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-yellow-dark)] font-medium">
                Unsaved changes
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSaveManualEdits}
                disabled={updateResultMutation.isPending}
                className="rounded-full text-xs flex items-center gap-1.5 border-[var(--color-brand-blue)]/40 text-[var(--color-brand-blue)] bg-white shadow-2xs"
              >
                {updateResultMutation.isPending ? (
                  <SpinnerGap size={14} className="animate-spin" />
                ) : (
                  <FloppyDisk size={14} />
                )}
                Save Edits
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3.5">
          {localResult?.deliverables?.map((item: ScopeDeliverable, idx: number) => (
            <div
              key={idx}
              className="rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] border-t-[3px] border-t-[var(--color-brand-yellow)] bg-white p-4 sm:p-5 shadow-[var(--shadow-subtle)] space-y-3 transition-all hover:shadow-[var(--shadow-card)]"
            >
              {/* Header row: Index, Title Input, Complexity, Hours, Delete */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleDeliverableChange(idx, 'title', e.target.value)}
                    className="flex-1 font-bold text-sm text-[var(--color-ink-deep)] border-b border-transparent hover:border-[var(--color-hairline-strong)] focus:border-[var(--color-brand-blue)] focus:outline-none bg-transparent py-0.5 transition-colors"
                    placeholder="Milestone Title"
                  />
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Complexity Selector */}
                  <div className="flex rounded-full bg-[var(--color-surface-soft)] p-0.5 border border-[var(--color-hairline)]">
                    {(['low', 'medium', 'high'] as const).map((level) => {
                      const active = (item.complexity || 'medium') === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleDeliverableChange(idx, 'complexity', level)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                            active
                              ? level === 'high'
                                ? 'bg-[var(--color-coral-light)] text-[var(--color-coral-dark)] shadow-2xs'
                                : level === 'medium'
                                  ? 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] shadow-2xs'
                                  : 'bg-[var(--color-teal-light)] text-[var(--color-moss-dark)] shadow-2xs'
                              : 'text-[var(--color-slate-text)] hover:text-[var(--color-ink)]'
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>

                  {/* Hours Input */}
                  <div className="flex items-center gap-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] px-2.5 py-0.5">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={item.estimated_hours === 0 ? '' : item.estimated_hours}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                        handleDeliverableChange(idx, 'estimated_hours', val);
                      }}
                      onBlur={() => {
                        if (!item.estimated_hours || item.estimated_hours < 1) {
                          handleDeliverableChange(idx, 'estimated_hours', 1);
                        }
                      }}
                      className="w-12 text-xs font-bold text-[var(--color-ink-deep)] bg-transparent text-right focus:outline-none"
                    />
                    <span className="text-[11px] font-semibold text-[var(--color-slate-text)]">
                      hrs
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliverable(idx)}
                    title="Remove deliverable"
                    className="p-1 rounded-md text-[var(--color-steel)] hover:text-[var(--color-error)] hover:bg-[var(--color-coral-light)]/40 transition-colors"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              </div>

              {/* Description textarea */}
              <div className="pl-8.5">
                <textarea
                  value={item.description}
                  onChange={(e) => handleDeliverableChange(idx, 'description', e.target.value)}
                  rows={2}
                  className="w-full text-xs leading-relaxed text-[var(--color-charcoal)] border border-transparent hover:border-[var(--color-hairline-strong)] focus:border-[var(--color-brand-blue)] focus:bg-white rounded-md p-1.5 bg-transparent focus:outline-none transition-colors"
                  placeholder="Technical description of what will be delivered..."
                />
              </div>

              {/* Skills Tags & Quick Add */}
              <div className="flex flex-wrap items-center gap-1.5 pl-8.5">
                {item.skills_required && item.skills_required.map((skill: string, sIdx: number) => (
                  <span
                    key={`${skill}-${sIdx}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-slate-text)]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(idx, sIdx)}
                      className="hover:text-[var(--color-coral-dark)] text-[var(--color-steel)] transition-colors ml-0.5 font-bold"
                      title={`Remove ${skill}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="+ Skill"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(idx, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  className="w-16 hover:w-24 focus:w-28 transition-all rounded-full bg-transparent border border-dashed border-[var(--color-hairline-strong)] hover:border-[var(--color-brand-blue)] px-2 py-0.5 text-[10px] text-[var(--color-ink)] placeholder:text-[var(--color-steel)] focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          ))}

          {/* Add Custom Deliverable Button */}
          <button
            type="button"
            onClick={handleAddDeliverable}
            className="w-full py-3.5 border-2 border-dashed border-[var(--color-hairline-strong)] hover:border-[var(--color-primary)] rounded-[var(--radius-xl)] bg-[var(--color-canvas)] text-xs font-semibold text-[var(--color-slate-text)] hover:text-[var(--color-primary)] flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <Plus size={16} weight="bold" />
            <span>Add Custom Deliverable Milestone</span>
          </button>
        </div>
      </div>

      {/* Risks & Recommendations Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {localResult?.risks_and_dependencies && localResult.risks_and_dependencies.length > 0 && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-brand-coral)]/30 bg-[var(--color-coral-light)]/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[var(--color-coral-dark)] font-bold text-xs uppercase tracking-wider">
              <WarningCircle size={16} weight="bold" />
              <h5>Risks & Dependencies</h5>
            </div>
            <ul className="space-y-1.5 text-xs text-[var(--color-coral-dark)]/90">
              {localResult.risks_and_dependencies.map((risk: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-[var(--color-brand-coral)] font-bold">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {localResult?.recommended_tech_stack && localResult.recommended_tech_stack.length > 0 && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-brand-teal)]/30 bg-[var(--color-teal-light)]/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[var(--color-moss-dark)] font-bold text-xs uppercase tracking-wider">
              <Code size={16} weight="bold" />
              <h5>Recommended Tech Stack</h5>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {localResult.recommended_tech_stack.map((tech: string) => (
                <span
                  key={tech}
                  className="rounded-full border border-[var(--color-brand-teal)]/30 bg-white px-3 py-1 text-xs font-semibold text-[var(--color-moss-dark)] shadow-xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons & Operational Conversion Bridge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-hairline-soft)] pt-5">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onDiscard}
          disabled={isConfirming}
          className="rounded-full flex items-center gap-2 shadow-xs"
        >
          <ArrowCounterClockwise size={16} />
          Modify Brief / Start Over
        </Button>

        <div className="flex items-center gap-2.5">
          {/* If already linked to project */}
          {isLinkedToProject ? (
            <Link
              href={`/workspaces/${workspaceId}/projects/${scopeRecord.projectId}`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-teal-light)] px-4 py-2 text-xs font-bold text-[var(--color-moss-dark)] border border-[var(--color-brand-teal)]/30 hover:shadow-xs transition-shadow"
            >
              <FolderOpen size={16} weight="bold" />
              Open Live Project
            </Link>
          ) : (
            <>
              {/* If not confirmed yet, show Approve & Confirm */}
              {!isConfirmed && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onConfirm}
                  disabled={isConfirming}
                  className="rounded-full flex items-center gap-2 shadow-xs"
                >
                  {isConfirming ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin text-[var(--color-brand-blue)]" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} weight="bold" className="text-[var(--color-moss-dark)]" />
                      Approve & Confirm
                    </>
                  )}
                </Button>
              )}

              {/* 1-Click Convert to Live Project CTA */}
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleOpenConvert}
                className="rounded-full flex items-center gap-2 shadow-[var(--shadow-subtle)] bg-[var(--color-ink-deep)] text-white hover:bg-black"
              >
                <FolderPlus size={18} weight="bold" className="text-[var(--color-brand-yellow)]" />
                Convert to Live Project
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Convert Scope Modal */}
      {isConvertModalOpen && (
        <ConvertScopeModal
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          workspaceId={workspaceId}
          scopeRecord={{
            ...scopeRecord,
            result: localResult,
          }}
          onConverted={(res) => {
            if (onScopeUpdated && res.scope) {
              onScopeUpdated(res.scope);
            }
          }}
        />
      )}
    </div>
  );
};
