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
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <Link
              href={`/workspaces/${workspaceId}/dashboard`}
              className="hover:text-neutral-900 dark:hover:text-neutral-200"
            >
              Workspace
            </Link>
            <CaretRight size={12} />
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              AI Scope Studio
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            <Sparkle size={26} className="text-blue-600 dark:text-blue-400" weight="fill" />
            AI Project Scope Studio
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}/projects`}>
            <Button variant="secondary" size="md" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Projects
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={handleStartNew}
            className="flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <Plus size={16} weight="bold" />
            New Analysis
          </Button>
        </div>
      </div>

      {/* Main Grid: Sidebar History + Content Panel */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left History Sidebar */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Analysis History
              </h3>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {scopes?.length || 0}
              </span>
            </div>

            {isHistoryLoading ? (
              <div className="space-y-2.5 py-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800"
                  />
                ))}
              </div>
            ) : scopes && scopes.length > 0 ? (
              <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
                {scopes.map((scope) => {
                  const isSelected = activeScope?.id === scope.id && !isCreatingNew;
                  const isConfirmed = Boolean(scope.confirmedAt);
                  return (
                    <div
                      key={scope.id}
                      onClick={() => handleSelectScope(scope)}
                      className={`w-full text-left transition rounded-xl p-3 border cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/60 dark:border-blue-500/80 dark:bg-blue-950/40'
                          : 'border-neutral-100 bg-neutral-50/60 hover:border-neutral-200 hover:bg-neutral-100/60 dark:border-neutral-800/80 dark:bg-neutral-950/40 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {scope.result?.summary?.slice(0, 45) || 'Scope Analysis'}...
                        </span>
                        {isConfirmed ? (
                          <CheckCircle size={14} className="shrink-0 text-emerald-500" weight="fill" />
                        ) : (
                          <Clock size={14} className="shrink-0 text-amber-500" weight="fill" />
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span>{new Date(scope.createdAt).toLocaleDateString()}</span>
                        <span>{scope.result?.timeline_weeks || 1}w duration</span>
                      </div>

                      {isConfirmed && (
                        <div className="mt-2.5 flex items-center justify-end border-t border-neutral-200/50 pt-2 dark:border-neutral-800/60">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDriftTargetScope(scope);
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/60 dark:hover:text-blue-300"
                          >
                            <Compass size={13} weight="bold" />
                            Detect Drift
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <FileText size={32} className="mx-auto text-neutral-400 dark:text-neutral-600" />
                <p className="mt-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  No previous scope analyses.
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Generate your first scope from a client brief.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Active Work Area */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {isCreatingNew || !activeScope ? (
              <ScopeGeneratorForm
                onGenerate={handleGenerate}
                isLoading={generateMutation.isPending}
                error={generateMutation.error}
              />
            ) : (
              <ScopeReviewDraft
                scopeRecord={activeScope}
                onConfirm={handleConfirm}
                onDiscard={handleStartNew}
                isConfirming={confirmMutation.isPending}
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
  );
};

