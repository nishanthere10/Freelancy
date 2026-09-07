'use client';

import React, { useState } from 'react';
import {
  Sparkle,
  SpinnerGap,
  CheckCircle,
  WarningCircle,
  XCircle,
  Clock,
  CurrencyDollar,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { DriftAnalysisRecord } from '@api/ai';
import { Button } from '@shared/components/Button';
import { Dialog } from '@shared/components/Dialog';
import { useAnalyzeDrift } from '../hooks/useDriftAnalysis';

interface DriftAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  scopeAnalysisId: string;
  scopeTitle?: string;
}

export const DriftAnalysisModal: React.FC<DriftAnalysisModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  scopeAnalysisId,
  scopeTitle,
}) => {
  const [changeRequestText, setChangeRequestText] = useState('');
  const [analysisRecord, setAnalysisRecord] = useState<DriftAnalysisRecord | null>(null);

  const analyzeMutation = useAnalyzeDrift(workspaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changeRequestText.trim().length < 10) return;

    try {
      const result = await analyzeMutation.mutateAsync({
        scopeAnalysisId,
        changeRequestText: changeRequestText.trim(),
      });
      setAnalysisRecord(result);
      toast.success('Scope drift analysis complete!');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to analyze scope drift';
      toast.error(message);
    }
  };

  const handleReset = () => {
    setAnalysisRecord(null);
    setChangeRequestText('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isTextValid = changeRequestText.trim().length >= 10;
  const result = analysisRecord?.result;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title="Scope Drift Detection"
      description={
        scopeTitle
          ? `Evaluating change request against: ${scopeTitle}`
          : 'Compare a client change request against the confirmed scope.'
      }
      className="max-w-2xl"
    >
      <div className="py-2">
        {analyzeMutation.isPending ? (
          <div
            data-testid="drift-loading"
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <SpinnerGap
              size={36}
              className="animate-spin text-blue-600 dark:text-blue-400"
            />
            <p className="mt-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Evaluating Scope Drift Impact...
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Cross-referencing change request against confirmed deliverables and timeline.
            </p>
          </div>
        ) : result ? (
          <div data-testid="drift-results" className="space-y-5">
            {/* Recommendation Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="flex items-center gap-2.5">
                {result.recommendation === 'accept' && (
                  <span
                    data-testid="recommendation-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <CheckCircle size={15} weight="fill" />
                    Accept Recommended
                  </span>
                )}
                {result.recommendation === 'decline' && (
                  <span
                    data-testid="recommendation-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <XCircle size={15} weight="fill" />
                    Decline Recommended
                  </span>
                )}
                {result.recommendation === 'negotiate' && (
                  <span
                    data-testid="recommendation-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    <WarningCircle size={15} weight="fill" />
                    Negotiation Required
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Confidence: <strong className="text-neutral-900 dark:text-neutral-100">{result.confidence_score}%</strong>
              </span>
            </div>

            {/* Impact Metric Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <Clock size={14} className="text-blue-500" />
                  Timeline Delta
                </div>
                <div className="mt-1.5 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  +{result.timeline_delta_days} days
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <CurrencyDollar size={14} className="text-emerald-500" />
                  Budget Delta
                </div>
                <div className="mt-1.5 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  +{result.budget_delta_percentage}%
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <Sparkle size={14} className="text-purple-500" />
                  Affected Items
                </div>
                <div className="mt-1.5 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {result.affected_deliverables.length}
                </div>
              </div>
            </div>

            {/* Summary & Rationale */}
            <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Executive Assessment
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {result.summary}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Recommendation Rationale
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {result.recommendation_rationale}
                </p>
              </div>
            </div>

            {/* Affected Deliverables Breakdown */}
            {result.affected_deliverables.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Affected Deliverables
                </h4>
                <div className="space-y-2">
                  {result.affected_deliverables.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200/60 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {item.title}
                        </span>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                          {item.impact_description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-neutral-200/60 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        +{item.additional_hours}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Deliverables Required */}
            {result.new_deliverables_required.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  New Scope Items Required
                </h4>
                <ul className="list-inside list-disc space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                  {result.new_deliverables_required.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-1.5"
              >
                <ArrowsClockwise size={14} />
                Analyze Another Request
              </Button>
              <Button variant="primary" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="change-request-input"
                className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
              >
                Client Change Request / Message
              </label>
              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                Paste the client’s Slack message, email, or brief requesting new features or changes.
              </p>
              <textarea
                id="change-request-input"
                rows={5}
                value={changeRequestText}
                onChange={(e) => setChangeRequestText(e.target.value)}
                placeholder="e.g. Can we also add automated recurring invoices and an export-to-PDF button before launch next Friday?"
                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                <span>Minimum 10 characters</span>
                <span>{changeRequestText.length} characters</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!isTextValid || analyzeMutation.isPending}
                className="flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              >
                <Sparkle size={14} weight="fill" />
                Analyze Scope Drift
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
};
