'use client';

import React from 'react';
import {
  CheckCircle,
  Clock,
  CalendarBlank,
  WarningCircle,
  Code,
  ArrowCounterClockwise,
  SpinnerGap,
  Sparkle,
} from '@phosphor-icons/react';
import type { ScopeAnalysisRecord, ScopeDeliverable } from '@api/ai';
import { Button } from '@shared/components/Button';

interface ScopeReviewDraftProps {
  scopeRecord: ScopeAnalysisRecord;
  onConfirm: () => void;
  onDiscard: () => void;
  isConfirming: boolean;
}

export const ScopeReviewDraft: React.FC<ScopeReviewDraftProps> = ({
  scopeRecord,
  onConfirm,
  onDiscard,
  isConfirming,
}) => {
  const result = scopeRecord.result;
  const isConfirmed = Boolean(scopeRecord.confirmedAt);

  // Compute total estimated hours across all deliverables
  const totalHours =
    result?.deliverables?.reduce((acc: number, curr: ScopeDeliverable) => acc + (curr.estimated_hours || 0), 0) || 0;

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
                Scope Analysis Draft
              </h3>
              <p className="text-xs text-[var(--color-slate-text)]">
                Generated {new Date(scopeRecord.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-teal-light)] px-3 py-1 text-xs font-semibold text-[var(--color-moss-dark)] border border-[var(--color-brand-teal)]/30">
                <CheckCircle size={14} weight="fill" />
                Confirmed & Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-yellow-light)] px-3 py-1 text-xs font-semibold text-[var(--color-yellow-dark)] border border-[var(--color-brand-yellow)]/40">
                <Clock size={14} weight="fill" />
                Unconfirmed Draft
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-pricing-featured)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-blue)] border border-[var(--color-brand-blue)]/20">
              {result?.confidence_score || 90}% Confidence
            </span>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] bg-[var(--color-surface-soft)] border border-[var(--color-hairline-soft)] p-4 text-sm leading-relaxed text-[var(--color-ink)]">
          {result?.summary}
        </div>

        {/* High Level Metrics Grid */}
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
              {result?.timeline_weeks || 1} {(result?.timeline_weeks || 1) === 1 ? 'week' : 'weeks'}
            </p>
          </div>

          <div className="col-span-2 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-white p-4 sm:col-span-1 shadow-xs">
            <div className="flex items-center gap-2 text-[var(--color-slate-text)]">
              <CheckCircle size={16} className="text-[var(--color-moss-dark)]" />
              <span className="text-xs font-semibold uppercase tracking-wider">Milestones</span>
            </div>
            <p className="mt-1.5 text-2xl font-bold text-[var(--color-ink-deep)] tracking-tight">
              {result?.deliverables?.length || 0} items
            </p>
          </div>
        </div>
      </div>

      {/* Deliverable Milestones Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
          Scoped Deliverables & Milestones
        </h4>
        <div className="space-y-3">
          {result?.deliverables?.map((item: ScopeDeliverable, idx: number) => (
            <div
              key={item.title + idx}
              className="rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] border-t-[3px] border-t-[var(--color-brand-yellow)] bg-white p-4 sm:p-5 shadow-[var(--shadow-subtle)] space-y-3 transition-all hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <h5 className="text-sm font-bold text-[var(--color-ink-deep)]">
                    {item.title}
                  </h5>
                </div>
                <div className="flex items-center gap-2">
                  {item.complexity && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        item.complexity === 'high'
                          ? 'bg-[var(--color-coral-light)] text-[var(--color-coral-dark)] border border-[var(--color-brand-coral)]/30'
                          : item.complexity === 'medium'
                            ? 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] border border-[var(--color-brand-yellow)]/40'
                            : 'bg-[var(--color-teal-light)] text-[var(--color-moss-dark)] border border-[var(--color-brand-teal)]/30'
                      }`}
                    >
                      {item.complexity} Complexity
                    </span>
                  )}
                  <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-ink-deep)]">
                    {item.estimated_hours} hrs
                  </span>
                </div>
              </div>

              <p className="pl-8.5 text-xs leading-relaxed text-[var(--color-charcoal)]">
                {item.description}
              </p>

              {item.skills_required && item.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-8.5">
                  {item.skills_required.map((skill: string) => (
                    <span
                      key={skill}
                      className="rounded-full bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-slate-text)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Risks & Recommendations Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Risks & Dependencies */}
        {result?.risks_and_dependencies && result.risks_and_dependencies.length > 0 && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-brand-coral)]/30 bg-[var(--color-coral-light)]/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[var(--color-coral-dark)] font-bold text-xs uppercase tracking-wider">
              <WarningCircle size={16} weight="bold" />
              <h5>Risks & Dependencies</h5>
            </div>
            <ul className="space-y-1.5 text-xs text-[var(--color-coral-dark)]/90">
              {result.risks_and_dependencies.map((risk: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-[var(--color-brand-coral)] font-bold">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tech Stack */}
        {result?.recommended_tech_stack && result.recommended_tech_stack.length > 0 && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-brand-teal)]/30 bg-[var(--color-teal-light)]/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[var(--color-moss-dark)] font-bold text-xs uppercase tracking-wider">
              <Code size={16} weight="bold" />
              <h5>Recommended Tech Stack</h5>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.recommended_tech_stack.map((tech: string) => (
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

      {/* Action Buttons */}
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

        {!isConfirmed && (
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onConfirm}
            disabled={isConfirming}
            className="rounded-full flex items-center gap-2 shadow-[var(--shadow-subtle)]"
          >
            {isConfirming ? (
              <>
                <SpinnerGap size={18} className="animate-spin text-[var(--color-brand-yellow)]" />
                Confirming Scope...
              </>
            ) : (
              <>
                <CheckCircle size={18} weight="bold" className="text-[var(--color-brand-yellow)]" />
                Approve & Confirm Scope
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
