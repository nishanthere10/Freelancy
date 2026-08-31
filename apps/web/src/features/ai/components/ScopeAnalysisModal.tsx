'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import type { ScopeAnalysisRecord } from '@api/ai';
import { Dialog } from '@shared/components/Dialog';
import { useConfirmScope, useGenerateScope } from '../hooks/useScopeAnalysis';
import { ScopeGeneratorForm } from './ScopeGeneratorForm';
import { ScopeReviewDraft } from './ScopeReviewDraft';

interface ScopeAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId?: string;
  onScopeConfirmed?: (scopeRecord: ScopeAnalysisRecord) => void;
}

export const ScopeAnalysisModal: React.FC<ScopeAnalysisModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  onScopeConfirmed,
}) => {
  const [draftScope, setDraftScope] = useState<ScopeAnalysisRecord | null>(null);

  const generateMutation = useGenerateScope(workspaceId);
  const confirmMutation = useConfirmScope(workspaceId);

  const handleGenerate = async (values: { inputText: string }) => {
    try {
      const generated = await generateMutation.mutateAsync({
        inputText: values.inputText,
        projectId,
      });
      setDraftScope(generated);
      toast.success('Scope analysis draft generated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate scope';
      toast.error(message);
    }
  };

  const handleConfirm = async () => {
    if (!draftScope) return;
    try {
      const confirmed = await confirmMutation.mutateAsync({
        scopeId: draftScope.id,
      });
      setDraftScope(confirmed);
      toast.success('Project scope confirmed and activated!');
      if (onScopeConfirmed) {
        onScopeConfirmed(confirmed);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to confirm scope';
      toast.error(message);
    }
  };

  const handleDiscard = () => {
    setDraftScope(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDraftScope(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="AI Scope Studio"
      description="Analyze raw briefs into structured deliverables and timeline estimates."
      className="max-w-3xl"
    >
      <div className="py-2">
        {draftScope ? (
          <ScopeReviewDraft
            scopeRecord={draftScope}
            onConfirm={handleConfirm}
            onDiscard={handleDiscard}
            isConfirming={confirmMutation.isPending}
          />
        ) : (
          <ScopeGeneratorForm
            onGenerate={handleGenerate}
            isLoading={generateMutation.isPending}
            error={generateMutation.error}
          />
        )}
      </div>
    </Dialog>
  );
};
