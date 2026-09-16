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
      className="max-w-2xl max-h-[88vh] overflow-y-auto no-scrollbar p-6 sm:p-8 rounded-[var(--radius-feature)] shadow-[var(--shadow-modal)]"
    >
      <div className="py-1">
        {analyzeMutation.isPending ? (
          <div
            data-testid="drift-loading"
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <SpinnerGap
              size={36}
              className="animate-spin text-[var(--color-brand-yellow)]"
            />
            <p className="mt-4 text-sm font-bold text-[var(--color-ink-deep)]">
              Evaluating Scope Drift Impact...
            </p>
            <p className="mt-1 text-xs text-[var(--color-slate-text)]">
              Cross-referencing change request against confirmed deliverables and timeline.
            </p>
          </div>
        ) : result ? (
          <div data-testid="drift-results" className="space-y-5">
            {/* Recommendation Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] p-4 shadow-xs">
              <div className="flex items-center gap-2.5">
                {result.recommendation === 'accept' && (
                  <span
                    data-testid="recommendation-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand-teal)]/30 bg-[var(--color-teal-light)] px-3 py-1 text-xs font-semibold text-[var(--color-moss-dark)]"
                  >
                    <CheckCircle size={15} weight="fill" />
                    Accept Recommended
                  </span>
                )}
                {result.recommendation === 'decline' && (
                  <span
                    data-testid="recommendation-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand-coral)]/30 bg-[var(--color-coral-light)] px-3 py-1 text-xs font-semibold text-[var(--color-coral-dark)]"
                  >
                    <XCircle size={15} weight="fill" />
                    Decline Recommended
                  </span>
                )}
                {result.recommendation === 'negotiate' && (
                  <span
                    data-testid="recommendation-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand-yellow)]/40 bg-[var(--color-yellow-light)] px-3 py-1 text-xs font-semibold text-[var(--color-yellow-dark)]"
                  >
                    <WarningCircle size={15} weight="fill" />
                    Negotiation Required
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-[var(--color-slate-text)]">
                Confidence: <strong className="text-[var(--color-ink-deep)] font-bold">{result.confidence_score}%</strong>
              </span>
            </div>

            {/* Impact Metric Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-white p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-slate-text)]">
                  <Clock size={14} className="text-[var(--color-brand-blue)]" />
                  Timeline Delta
                </div>
                <div className="mt-1.5 text-lg font-bold text-[var(--color-ink-deep)]">
                  +{result.timeline_delta_days} days
                </div>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-white p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-slate-text)]">
                  <CurrencyDollar size={14} className="text-[var(--color-moss-dark)]" />
                  Budget Delta
                </div>
                <div className="mt-1.5 text-lg font-bold text-[var(--color-ink-deep)]">
                  +{result.budget_delta_percentage}%
                </div>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-white p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-slate-text)]">
                  <Sparkle size={14} className="text-[var(--color-brand-yellow-deep)]" weight="fill" />
                  Affected Items
                </div>
                <div className="mt-1.5 text-lg font-bold text-[var(--color-ink-deep)]">
                  {result.affected_deliverables.length}
                </div>
              </div>
            </div>

            {/* Summary & Rationale */}
            <div className="space-y-3 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-white p-4 shadow-xs">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
                  Executive Assessment
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-charcoal)]">
                  {result.summary}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
                  Recommendation Rationale
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-charcoal)]">
                  {result.recommendation_rationale}
                </p>
              </div>
            </div>

            {/* Affected Deliverables Breakdown */}
            {result.affected_deliverables.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
                  Affected Deliverables
                </h4>
                <div className="space-y-2">
                  {result.affected_deliverables.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] p-3"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[var(--color-ink-deep)]">
                          {item.title}
                        </span>
                        <p className="text-[11px] text-[var(--color-slate-text)]">
                          {item.impact_description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-ink-deep)]">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
                  New Scope Items Required
                </h4>
                <ul className="list-inside list-disc space-y-1 text-xs text-[var(--color-charcoal)]">
                  {result.new_deliverables_required.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 border-t border-[var(--color-hairline-soft)] pt-4 mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReset}
                className="rounded-full shadow-xs flex items-center gap-1.5"
              >
                <ArrowsClockwise size={14} />
                Analyze Another Request
              </Button>
              <Button variant="primary" size="sm" onClick={handleClose} className="rounded-full shadow-xs">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="change-request-input"
                className="block text-xs font-bold text-[var(--color-ink-deep)]"
              >
                Client Change Request / Message
              </label>
              <p className="mt-0.5 text-[11px] text-[var(--color-slate-text)]">
                Paste the client’s Slack message, email, or brief requesting new features or changes.
              </p>
              <textarea
                id="change-request-input"
                rows={5}
                value={changeRequestText}
                onChange={(e) => setChangeRequestText(e.target.value)}
                placeholder="e.g. Can we also add automated recurring invoices and an export-to-PDF button before launch next Friday?"
                className="mt-2 w-full rounded-[var(--radius-xl)] border border-[var(--color-hairline-strong)] bg-white p-3 text-xs text-[var(--color-ink-deep)] placeholder:text-[var(--color-steel)] focus:border-[var(--color-brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]/20 transition-all leading-relaxed"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-slate-text)]">
                <span>Minimum 10 characters</span>
                <span className="font-medium text-[var(--color-charcoal)]">{changeRequestText.length} characters</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-[var(--color-hairline-soft)] pt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClose}
                className="rounded-full shadow-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!isTextValid || analyzeMutation.isPending}
                className="rounded-full shadow-xs flex items-center gap-1.5"
              >
                <Sparkle size={14} weight="fill" className="text-[var(--color-brand-yellow)]" />
                Analyze Scope Drift
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
};
