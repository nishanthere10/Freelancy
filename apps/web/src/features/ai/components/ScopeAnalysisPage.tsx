'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Sparkle,
  Plus,
  Clock,
  CheckCircle,
  FileText,
  CaretRight,
  ArrowLeft,
  Compass,
} from '@phosphor-icons/react';
import type { ScopeAnalysisRecord } from '@api/ai';
import { Button } from '@shared/components/Button';
import { useConfirmScope, useGenerateScope, useScopeAnalyses } from '../hooks/useScopeAnalysis';
import { DriftAnalysisModal } from './DriftAnalysisModal';
import { ScopeGeneratorForm } from './ScopeGeneratorForm';
import { ScopeReviewDraft } from './ScopeReviewDraft';

interface ScopeAnalysisPageProps {
  workspaceId: string;
}

export const ScopeAnalysisPage: React.FC<ScopeAnalysisPageProps> = ({ workspaceId }) => {
  const [activeScope, setActiveScope] = useState<ScopeAnalysisRecord | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const [driftTargetScope, setDriftTargetScope] = useState<ScopeAnalysisRecord | null>(null);

  const { data: scopes, isLoading: isHistoryLoading } = useScopeAnalyses(workspaceId);
  const generateMutation = useGenerateScope(workspaceId);
  const confirmMutation = useConfirmScope(workspaceId);

  const handleGenerate = async (values: { inputText: string }) => {
    try {
      const generated = await generateMutation.mutateAsync({
        inputText: values.inputText,
      });
      setActiveScope(generated);
      setIsCreatingNew(false);
      toast.success('Scope analysis generated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate scope';
      toast.error(message);
    }
  };

  const handleConfirm = async () => {
    if (!activeScope) return;
    try {
      const confirmed = await confirmMutation.mutateAsync({
        scopeId: activeScope.id,
      });
      setActiveScope(confirmed);
      toast.success('Project scope confirmed and activated!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to confirm scope';
      toast.error(message);
    }
  };

  const handleSelectScope = (scope: ScopeAnalysisRecord) => {
    setActiveScope(scope);
    setIsCreatingNew(false);
  };

  const handleStartNew = () => {
    setActiveScope(null);
    setIsCreatingNew(true);
  };

  return (
    <div className="w-full min-h-screen bg-[var(--color-surface-soft)]">
      <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 pb-24 space-y-8">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-[var(--radius-xl)] bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] border border-[var(--color-brand-yellow)]/30 flex items-center justify-center font-semibold shadow-xs">
              <Sparkle size={24} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-slate-text)] mb-0.5">
                <Link
                  href={`/workspaces/${workspaceId}/dashboard`}
                  className="hover:text-[var(--color-ink)] transition-colors"
                >
                  Workspace
                </Link>
                <CaretRight size={11} className="text-[var(--color-steel)]" />
                <span className="font-medium text-[var(--color-ink-deep)]">
                  AI Scope Studio
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep)] tracking-tight">
                AI Project Scope Studio
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-slate-text)] mt-0.5">
                Deconstruct raw briefs into deliverables, milestones, tech stacks, and timeline models.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
            <Link href={`/workspaces/${workspaceId}/projects`}>
              <Button variant="secondary" size="md" className="rounded-full shadow-xs flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Projects
              </Button>
            </Link>
            <Button
              variant="primary"
              size="md"
              onClick={handleStartNew}
              className="rounded-full shadow-xs flex items-center gap-2"
            >
              <Plus size={16} weight="bold" className="text-[var(--color-brand-yellow)]" />
              New Analysis
            </Button>
          </div>
        </div>

        {/* Main Grid: Sidebar History + Content Panel */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left History Sidebar */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-[var(--radius-xxl)] border border-[var(--color-hairline-soft)] bg-white p-5 shadow-[var(--shadow-card)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-hairline-soft)] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
                  Analysis History
                </h3>
                <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-ink-deep)]">
                  {scopes?.length || 0}
                </span>
              </div>

              {isHistoryLoading ? (
                <div className="space-y-2.5 py-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-soft)] border border-[var(--color-hairline-soft)]"
                    />
                  ))}
                </div>
              ) : scopes && scopes.length > 0 ? (
                <div className="max-h-[600px] space-y-2.5 overflow-y-auto pr-1 no-scrollbar">
                  {scopes.map((scope) => {
                    const isSelected = activeScope?.id === scope.id && !isCreatingNew;
                    const isConfirmed = Boolean(scope.confirmedAt);
                    return (
                      <div
                        key={scope.id}
                        onClick={() => handleSelectScope(scope)}
                        className={`w-full text-left transition-all rounded-[var(--radius-xl)] p-3.5 border cursor-pointer ${
                          isSelected
                            ? 'border-2 border-[var(--color-primary)] bg-[var(--color-surface-soft)] shadow-xs'
                            : 'border-[var(--color-hairline-soft)] bg-white hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-surface-soft)] shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="line-clamp-1 text-xs font-bold text-[var(--color-ink-deep)]">
                            {scope.result?.summary?.slice(0, 45) || 'Scope Analysis'}...
                          </span>
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-teal-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-moss-dark)] border border-[var(--color-brand-teal)]/30 shrink-0">
                              <CheckCircle size={12} weight="fill" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-yellow-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-yellow-dark)] border border-[var(--color-brand-yellow)]/40 shrink-0">
                              <Clock size={12} weight="fill" />
                              Draft
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-slate-text)]">
                          <span>{new Date(scope.createdAt).toLocaleDateString()}</span>
                          <span className="font-medium text-[var(--color-charcoal)]">{scope.result?.timeline_weeks || 1}w duration</span>
                        </div>

                        {isConfirmed && (
                          <div className="mt-2.5 flex items-center justify-end border-t border-[var(--color-hairline-soft)] pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDriftTargetScope(scope);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-hairline-strong)] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-ink)] hover:border-[var(--color-brand-yellow)] hover:bg-[var(--color-yellow-light)] transition-all shadow-xs"
                            >
                              <Compass size={13} weight="bold" className="text-[var(--color-brand-yellow-deep)]" />
                              Detect Drift
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <FileText size={32} className="mx-auto text-[var(--color-steel)]" />
                  <p className="text-xs font-semibold text-[var(--color-ink-deep)]">
                    No previous scope analyses
                  </p>
                  <p className="text-[11px] text-[var(--color-slate-text)]">
                    Generate your first scope from a client brief.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Active Work Area */}
          <div className="lg:col-span-8">
            <div className="rounded-[var(--radius-xxl)] border border-[var(--color-hairline-soft)] bg-white p-6 sm:p-8 lg:p-10 shadow-[var(--shadow-card)]">
              {isCreatingNew || !activeScope ? (
                <ScopeGeneratorForm
                  onGenerate={handleGenerate}
                  isLoading={generateMutation.isPending}
                  error={generateMutation.error}
                />
              ) : (
                <ScopeReviewDraft
                  scopeRecord={activeScope}
                  workspaceId={workspaceId}
                  onConfirm={handleConfirm}
                  onDiscard={handleStartNew}
                  isConfirming={confirmMutation.isPending}
                  onScopeUpdated={(updated) => setActiveScope(updated)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Scope Drift Detection Modal */}
        {driftTargetScope && (
          <DriftAnalysisModal
            isOpen={Boolean(driftTargetScope)}
            onClose={() => setDriftTargetScope(null)}
            workspaceId={workspaceId}
            scopeAnalysisId={driftTargetScope.id}
            scopeTitle={driftTargetScope.result?.summary}
          />
        )}
      </div>
    </div>
  );
};

