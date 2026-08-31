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
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Sparkle size={18} weight="fill" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Scope Analysis Draft
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Generated {new Date(scopeRecord.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle size={14} weight="fill" />
                Confirmed & Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Clock size={14} weight="fill" />
                Unconfirmed Draft
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {result?.confidence_score || 90}% Confidence
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {result?.summary}
        </p>

        {/* High Level Metrics Grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/60">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Clock size={16} />
              <span className="text-xs font-medium">Estimated Work</span>
            </div>
            <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {totalHours} hrs
            </p>
          </div>

          <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/60">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <CalendarBlank size={16} />
              <span className="text-xs font-medium">Duration</span>
            </div>
            <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {result?.timeline_weeks || 1} {(result?.timeline_weeks || 1) === 1 ? 'week' : 'weeks'}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5 sm:col-span-1 dark:border-neutral-800 dark:bg-neutral-950/60">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <CheckCircle size={16} />
              <span className="text-xs font-medium">Milestones</span>
            </div>
            <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {result?.deliverables?.length || 0} items
            </p>
          </div>
        </div>
      </div>

      {/* Deliverable Milestones Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Scoped Deliverables & Milestones
        </h4>
        <div className="space-y-3">
          {result?.deliverables?.map((item: ScopeDeliverable, idx: number) => (
            <div
              key={item.title + idx}
              className="rounded-xl border border-neutral-200/70 bg-white p-4 shadow-sm transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/90 dark:hover:border-neutral-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {idx + 1}
                  </span>
                  <h5 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.title}
                  </h5>
                </div>
                <div className="flex items-center gap-2">
                  {item.complexity && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                        item.complexity === 'high'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : item.complexity === 'medium'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}
                    >
                      {item.complexity} Complexity
                    </span>
                  )}
                  <span className="rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                    {item.estimated_hours} hrs
                  </span>
                </div>
              </div>

              <p className="mt-2.5 pl-8 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                {item.description}
              </p>

              {item.skills_required && item.skills_required.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 pl-8">
                  {item.skills_required.map((skill: string) => (
                    <span
                      key={skill}
                      className="rounded bg-neutral-100/80 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-400"
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
          <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <WarningCircle size={16} weight="bold" />
              <h5 className="text-xs font-semibold uppercase tracking-wider">
                Risks & Dependencies
              </h5>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs text-amber-900/80 dark:text-amber-300/80">
              {result.risks_and_dependencies.map((risk: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-amber-500">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tech Stack */}
        {result?.recommended_tech_stack && result.recommended_tech_stack.length > 0 && (
          <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <Code size={16} weight="bold" />
              <h5 className="text-xs font-semibold uppercase tracking-wider">
                Recommended Tech Stack
              </h5>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {result.recommended_tech_stack.map((tech: string) => (
                <span
                  key={tech}
                  className="rounded-lg border border-blue-200/80 bg-white px-2.5 py-1 text-xs font-medium text-blue-900 shadow-xs dark:border-blue-800 dark:bg-neutral-900 dark:text-blue-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onDiscard}
          disabled={isConfirming}
          className="flex items-center gap-2"
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
            className="flex items-center gap-2 shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isConfirming ? (
              <>
                <SpinnerGap size={18} className="animate-spin" />
                Confirming Scope...
              </>
            ) : (
              <>
                <CheckCircle size={18} weight="bold" />
                Approve & Confirm Scope
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
