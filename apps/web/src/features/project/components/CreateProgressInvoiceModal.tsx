'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Receipt,
  WarningCircle,
  SpinnerGap,
} from '@phosphor-icons/react';
import { Button } from '@shared/components/Button';
import { Dialog } from '@shared/components/Dialog';
import { useCreateProgressInvoice } from '../hooks';
import type { ProjectDeliverable } from '../api';

interface CreateProgressInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  projectBudget: number;
  projectCurrency: string;
  deliverables: ProjectDeliverable[];
}

export const CreateProgressInvoiceModal: React.FC<
  CreateProgressInvoiceModalProps
> = ({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  projectBudget,
  projectCurrency,
  deliverables,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [taxRate, setTaxRate] = useState('18.00');
  const [discountRate, setDiscountRate] = useState('0.00');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  const createInvoiceMutation = useCreateProgressInvoice(workspaceId, projectId);

  // Filter deliverables eligible for progress invoicing: status === 'completed' && !billedAt
  const eligibleDeliverables = useMemo(() => {
    return deliverables.filter((d) => d.status === 'completed' && !d.billedAt);
  }, [deliverables]);

  // Calculate proportional value for each deliverable
  const totalProjectHours = useMemo(() => {
    return deliverables.reduce(
      (sum, d) => sum + Math.max(1, Number(d.estimatedHours || 1)),
      0
    );
  }, [deliverables]);

  const calculateDeliverableValue = useCallback(
    (d: ProjectDeliverable) => {
      if (projectBudget <= 0 || totalProjectHours <= 0) return 0;
      const hours = Math.max(1, Number(d.estimatedHours || 1));
      return Math.round((hours / totalProjectHours) * projectBudget * 100) / 100;
    },
    [projectBudget, totalProjectHours]
  );

  // Preview financial totals
  const subtotal = useMemo(() => {
    return selectedIds.reduce((sum, id) => {
      const d = deliverables.find((item) => item.id === id);
      return sum + (d ? calculateDeliverableValue(d) : 0);
    }, 0);
  }, [selectedIds, deliverables, calculateDeliverableValue]);

  const discountAmount = useMemo(() => {
    const rate = Number(discountRate) || 0;
    return (subtotal * rate) / 100;
  }, [subtotal, discountRate]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    const rate = Number(taxRate) || 0;
    return (taxableAmount * rate) / 100;
  }, [taxableAmount, taxRate]);

  const totalAmount = taxableAmount + taxAmount;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === eligibleDeliverables.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleDeliverables.map((d) => d.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    try {
      await createInvoiceMutation.mutateAsync({
        deliverableIds: selectedIds,
        dueDate: dueDate || null,
        notes: notes.trim() || undefined,
        discountRate: discountRate || '0.00',
        taxRate: taxRate || '18.00',
      });
      setSelectedIds([]);
      onClose();
    } catch {
      // Error handled by mutation toast
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Create Progress Invoice"
      description="Select completed milestone deliverables to generate an itemized billing invoice."
      className="max-w-xl max-h-[88vh] overflow-y-auto no-scrollbar p-6 rounded-[var(--radius-feature)] shadow-[var(--shadow-modal)]"
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        {eligibleDeliverables.length === 0 ? (
          <div className="py-8 text-center space-y-2 bg-[var(--color-surface-soft)] rounded-[var(--radius-lg)] p-4 border border-[var(--color-hairline-soft)]">
            <WarningCircle className="h-8 w-8 text-[var(--color-yellow-dark)] mx-auto" />
            <p className="text-sm font-bold text-[var(--color-ink-deep)]">
              No Completed Deliverables to Bill
            </p>
            <p className="text-xs text-[var(--color-slate-text)] max-w-sm mx-auto">
              Progress invoices can only be generated for deliverables that are marked as{' '}
              <span className="font-semibold text-[var(--color-brand-teal)]">Completed</span>{' '}
              and have not been previously billed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-ink-deep)]">
                Completed Milestones ({selectedIds.length} of {eligibleDeliverables.length} selected)
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-[var(--color-brand-blue)] hover:underline"
              >
                {selectedIds.length === eligibleDeliverables.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto border border-[var(--color-hairline)] rounded-[var(--radius-lg)] divide-y divide-[var(--color-hairline-soft)]">
              {eligibleDeliverables.map((d) => {
                const isSelected = selectedIds.includes(d.id);
                const value = calculateDeliverableValue(d);

                return (
                  <label
                    key={d.id}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors text-xs ${
                      isSelected ? 'bg-[var(--color-teal-light)]/30' : 'hover:bg-[var(--color-surface-soft)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(d.id)}
                        className="rounded border-[var(--color-hairline)] text-[var(--color-brand-teal)] focus:ring-[var(--color-brand-teal)]"
                      />
                      <div>
                        <p className="font-bold text-[var(--color-ink-deep)]">{d.title}</p>
                        <p className="text-[11px] text-[var(--color-slate-text)]">
                          {d.estimatedHours}h estimated · {d.loggedHours}h logged
                        </p>
                      </div>
                    </div>

                    <span className="font-mono font-bold text-[var(--color-ink-deep)]">
                      {projectCurrency} {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Invoice Configuration Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--color-ink-deep)] mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-hairline)] focus:outline-none focus:border-[var(--color-brand-yellow)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-ink-deep)] mb-1">
              Tax Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-hairline)] focus:outline-none focus:border-[var(--color-brand-yellow)] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-ink-deep)] mb-1">
              Discount (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={discountRate}
              onChange={(e) => setDiscountRate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-hairline)] focus:outline-none focus:border-[var(--color-brand-yellow)] font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--color-ink-deep)] mb-1">
            Invoice Notes / Terms
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Progress billing for sprint milestone deliverables..."
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-hairline)] focus:outline-none focus:border-[var(--color-brand-yellow)]"
          />
        </div>

        {/* Live Calculation Preview Card */}
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] space-y-2 text-xs">
          <div className="flex justify-between text-[var(--color-slate-text)]">
            <span>Milestone Subtotal:</span>
            <span className="font-mono font-medium text-[var(--color-ink-deep)]">
              {projectCurrency} {subtotal.toFixed(2)}
            </span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-[var(--color-slate-text)]">
              <span>Discount ({discountRate}%):</span>
              <span className="font-mono font-medium text-[var(--color-error)]">
                -{projectCurrency} {discountAmount.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-[var(--color-slate-text)]">
            <span>Tax ({taxRate}%):</span>
            <span className="font-mono font-medium text-[var(--color-ink-deep)]">
              +{projectCurrency} {taxAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between pt-2 border-t border-[var(--color-hairline-soft)] text-sm font-bold text-[var(--color-ink-deep)]">
            <span>Total Invoiced:</span>
            <span className="font-mono text-[var(--color-brand-teal)]">
              {projectCurrency} {totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-hairline-soft)]">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={
              createInvoiceMutation.isPending ||
              selectedIds.length === 0 ||
              eligibleDeliverables.length === 0
            }
            className="rounded-full text-xs font-semibold gap-1.5"
          >
            {createInvoiceMutation.isPending ? (
              <>
                <SpinnerGap className="h-4 w-4 animate-spin" /> Creating Invoice...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" weight="bold" /> Generate Progress Invoice
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
