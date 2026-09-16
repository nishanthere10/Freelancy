'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarBlank,
  CurrencyDollar,
  FolderPlus,
  Receipt,
  Sparkle,
  SpinnerGap,
  User,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  type ConvertScopeResponse,
  type ScopeAnalysisRecord,
  confirmScopeAnalysis,
} from '@api/ai';
import { useClients } from '@features/client';
import { Button } from '@shared/components/Button';
import { Dialog } from '@shared/components/Dialog';
import { Input } from '@shared/components/Input';
import { useConvertScope } from '../hooks/useScopeRefinement';

interface ConvertScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  scopeRecord: ScopeAnalysisRecord;
  onConverted?: (response: ConvertScopeResponse) => void;
}

export const ConvertScopeModal: React.FC<ConvertScopeModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  scopeRecord,
  onConverted,
}) => {
  const router = useRouter();
  const result = scopeRecord.result;
  const { data: clientsData, isLoading: isLoadingClients } = useClients(workspaceId);
  const convertMutation = useConvertScope(workspaceId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive reasonable defaults from scope
  const summaryText = result?.summary || '';
  const firstLine = summaryText
    ? summaryText.split('\n')[0].replace(/^Architecture & Delivery Plan for:\s*/i, '')
    : 'Client Project';
  const defaultTitle = firstLine.slice(0, 60) || 'Client Project';

  const defaultTotalHours =
    result?.deliverables?.reduce((acc, d) => acc + (d.estimated_hours || 0), 0) || 40;

  const weeks = result?.timeline_weeks || 2;
  const targetDateObj = new Date();
  targetDateObj.setDate(targetDateObj.getDate() + weeks * 7);
  const defaultTargetDate = targetDateObj.toISOString().split('T')[0];

  const [name, setName] = useState(defaultTitle);
  const [description, setDescription] = useState(summaryText);
  const [clientId, setClientId] = useState('');
  const [budget, setBudget] = useState(String(defaultTotalHours * 85)); // standard $85/hr estimate
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState(defaultTargetDate);
  const [depositPercentage, setDepositPercentage] = useState<number>(50); // 50% default

  // Synchronize defaults whenever modal opens or scopeRecord changes
  const [prevOpenState, setPrevOpenState] = useState({ isOpen: false, id: scopeRecord.id });
  if (isOpen && (!prevOpenState.isOpen || prevOpenState.id !== scopeRecord.id)) {
    setPrevOpenState({ isOpen: true, id: scopeRecord.id });
    setName(defaultTitle);
    setDescription(summaryText);
    setClientId('');
    setBudget(String(defaultTotalHours * 85));
    setDepositPercentage(50);
    setTargetDate(defaultTargetDate);
    setStartDate(new Date().toISOString().split('T')[0]);
  } else if (!isOpen && prevOpenState.isOpen) {
    setPrevOpenState({ isOpen: false, id: scopeRecord.id });
  }

  const numericBudget = Math.max(0, Number(budget) || 0);
  const depositAmount = (numericBudget * depositPercentage) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }

    if (targetDate && startDate && new Date(targetDate) < new Date(startDate)) {
      toast.error('Target completion date cannot be before start date');
      return;
    }

    setIsSubmitting(true);
    try {
      // If scope analysis is not confirmed yet, auto-confirm prior to conversion
      if (!scopeRecord.confirmedAt) {
        await confirmScopeAnalysis(workspaceId, scopeRecord.id);
      }

      const response = await convertMutation.mutateAsync({
        scopeId: scopeRecord.id,
        projectData: {
          name: name.trim(),
          description: description.trim() || undefined,
          clientId: clientId || undefined,
          status: 'active',
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
          budget: numericBudget,
          currency,
          depositPercentage,
          depositDueDays: 14,
        },
      });

      toast.success(
        depositPercentage > 0 && clientId
          ? 'Project & deposit invoice generated successfully!'
          : 'Project successfully created from scope!'
      );

      if (onConverted) {
        onConverted(response);
      }
      onClose();

      // Navigate to project
      if (response?.project?.id) {
        router.push(`/workspaces/${workspaceId}/projects/${response.project.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to convert scope to project';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Convert Scope to Live Project"
      description="Turn this tailored scope analysis into an active project and optional deposit invoice."
      className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar p-6 sm:p-8 rounded-[var(--radius-feature)] shadow-[var(--shadow-modal)]"
    >
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        {/* Scope Source Badge */}
        <div className="flex items-center gap-2.5 rounded-[var(--radius-xl)] bg-[var(--color-yellow-light)]/40 border border-[var(--color-brand-yellow)]/30 p-3.5 text-xs text-[var(--color-ink-deep)]">
          <Sparkle size={16} className="shrink-0 text-[var(--color-yellow-dark)]" weight="fill" />
          <span>
            Converting <strong>{result?.deliverables?.length || 0} scoped milestones</strong> ({defaultTotalHours} hrs total estimate, ~{result?.timeline_weeks || 1} weeks duration).
          </span>
        </div>

        {/* Project Details */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)] mb-1.5 block">
              Project Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Web App MVP"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)] mb-1.5 block">
              Description / Summary
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-canvas)] px-4 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[var(--color-brand-blue)]/20"
              placeholder="Project goals and technical specifications"
            />
          </div>

          {/* Client Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)] mb-1.5 block flex items-center gap-1.5">
              <User size={14} />
              Assign Client (Optional)
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={isLoadingClients}
              className="w-full h-11 rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-canvas)] px-3 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-brand-blue)]"
            >
              <option value="">No client assigned (Internal Project)</option>
              {clientsData?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.companyName ? `(${client.companyName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dates and Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)] mb-1.5 block flex items-center gap-1.5">
                <CurrencyDollar size={14} />
                Total Project Budget
              </label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-11 rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-canvas)] px-3 text-sm font-semibold text-[var(--color-ink)] focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="5000"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)] mb-1.5 block flex items-center gap-1.5">
                <CalendarBlank size={14} />
                Target Completion Date
              </label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Deposit Invoice Configuration */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-[var(--color-brand-blue)]" weight="bold" />
              <span className="text-sm font-bold text-[var(--color-ink-deep)]">
                Upfront Deposit Invoice
              </span>
            </div>
            {!clientId && depositPercentage > 0 && (
              <span className="text-[11px] text-[var(--color-coral-dark)] font-medium">
                (Assign client above to generate invoice)
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--color-slate-text)] leading-relaxed">
            Automatically create a professional draft invoice in your workspace with line items corresponding to the scoped deliverables.
          </p>

          {/* Quick Pill Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'None (0%)', value: 0 },
              { label: '25% Deposit', value: 25 },
              { label: '50% Deposit (Recommended)', value: 50 },
              { label: '100% Full Payment', value: 100 },
            ].map((pill) => {
              const active = depositPercentage === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setDepositPercentage(pill.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'bg-white text-[var(--color-charcoal)] border border-[var(--color-hairline-strong)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Calculation Display */}
          {depositPercentage > 0 && (
            <div className="rounded-[var(--radius-md)] bg-white border border-[var(--color-hairline-soft)] p-3 flex items-center justify-between text-xs">
              <span className="text-[var(--color-slate-text)]">
                Deposit amount due upon project start:
              </span>
              <span className="font-bold text-sm text-[var(--color-ink-deep)]">
                {currency} {depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-hairline-soft)]">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting || convertMutation.isPending}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || convertMutation.isPending || !name.trim()}
            className="rounded-full flex items-center gap-2 shadow-xs"
          >
            {isSubmitting || convertMutation.isPending ? (
              <>
                <SpinnerGap size={16} className="animate-spin text-[var(--color-brand-yellow)]" />
                Creating Project...
              </>
            ) : (
              <>
                <FolderPlus size={16} weight="bold" className="text-[var(--color-brand-yellow)]" />
                Create Live Project {depositPercentage > 0 && clientId ? '& Invoice' : ''}
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
