"use client";

import {
  CalendarBlank,
  CheckCircle,
  Clock,
  CurrencyDollar,
  FileText,
  Plus,
  Receipt,
  Sparkle,
  SpinnerGap,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@shared/components/Button";
import { Dialog } from "@shared/components/Dialog";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeOrder, ProposedDeliverableItem } from "../api";
import {
  useApproveChangeOrder,
  useCreateChangeOrder,
  useUpdateChangeOrderDraft,
} from "../hooks/useChangeOrders";

interface ChangeOrderProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  scopeAnalysisId: string;
  driftAnalysisId?: string | null;
  projectBudget?: string | null;
  projectCurrency?: string;
  projectTargetDate?: string | null;
  existingDraft?: ChangeOrder | null;
  initialTitle?: string;
  initialDescription?: string;
  initialAdditionalBudget?: string | number;
  initialAdditionalHours?: string | number;
  initialTimelineDeltaDays?: number;
  initialDeliverables?: ProposedDeliverableItem[];
}

export const ChangeOrderProposalModal: React.FC<
  ChangeOrderProposalModalProps
> = ({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  scopeAnalysisId,
  driftAnalysisId,
  projectBudget,
  projectCurrency = "INR",
  projectTargetDate,
  existingDraft,
  initialTitle = "",
  initialDescription = "",
  initialAdditionalBudget = "0.00",
  initialAdditionalHours = "0.00",
  initialTimelineDeltaDays = 0,
  initialDeliverables = [],
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [additionalBudget, setAdditionalBudget] = useState("0.00");
  const [timelineDeltaDays, setTimelineDeltaDays] = useState(0);
  const [deliverables, setDeliverables] = useState<ProposedDeliverableItem[]>(
    [],
  );
  const [invoiceDueDate, setInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const createMutation = useCreateChangeOrder(workspaceId, projectId);
  const updateMutation = useUpdateChangeOrderDraft(workspaceId, projectId);
  const approveMutation = useApproveChangeOrder(workspaceId, projectId);

  const isEditing = Boolean(existingDraft);

  useEffect(() => {
    if (!isOpen) return;

    if (existingDraft) {
      setTitle(existingDraft.title);
      setDescription(existingDraft.description || "");
      setAdditionalBudget(existingDraft.additionalBudget || "0.00");
      setTimelineDeltaDays(existingDraft.timelineDeltaDays || 0);
      setDeliverables(existingDraft.proposedDeliverables || []);
    } else {
      setTitle(initialTitle || "Change Order: Scope Expansion");
      setDescription(initialDescription || "");
      setAdditionalBudget(String(initialAdditionalBudget || "0.00"));
      setTimelineDeltaDays(initialTimelineDeltaDays || 0);
      setDeliverables(
        initialDeliverables.length > 0
          ? initialDeliverables
          : [
              {
                title: "New Scope Feature",
                estimatedHours: 4,
                complexity: "medium",
              },
            ],
      );
    }
  }, [isOpen, existingDraft?.id]);

  const totalProposedHours = useMemo(() => {
    return deliverables.reduce(
      (sum, d) => sum + (Number(d.estimatedHours) || 0),
      0,
    );
  }, [deliverables]);

  const currentBudgetNum = Number(projectBudget || 0);
  const additionalBudgetNum = Number(additionalBudget || 0);
  const newProjectBudget = (currentBudgetNum + additionalBudgetNum).toFixed(2);

  const newTargetDate = useMemo(() => {
    if (!projectTargetDate) return "Not set";
    if (!timelineDeltaDays || timelineDeltaDays <= 0) return projectTargetDate;
    const date = new Date(projectTargetDate);
    date.setDate(date.getDate() + timelineDeltaDays);
    return date.toISOString().split("T")[0];
  }, [projectTargetDate, timelineDeltaDays]);

  const handleAddDeliverable = () => {
    setDeliverables((prev) => [
      ...prev,
      {
        title: `Extra Deliverable ${prev.length + 1}`,
        estimatedHours: 4,
        complexity: "medium",
      },
    ]);
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeliverableChange = (
    index: number,
    field: keyof ProposedDeliverableItem,
    val: any,
  ) => {
    setDeliverables((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) return;
    if (deliverables.length === 0) return;

    if (existingDraft) {
      await updateMutation.mutateAsync({
        changeOrderId: existingDraft.id,
        data: {
          title: title.trim(),
          description: description.trim() || null,
          additionalBudget,
          additionalHours: totalProposedHours,
          timelineDeltaDays,
          proposedDeliverables: deliverables,
        },
      });
    } else {
      await createMutation.mutateAsync({
        scopeAnalysisId,
        driftAnalysisId: driftAnalysisId || null,
        title: title.trim(),
        description: description.trim() || null,
        additionalBudget,
        additionalHours: totalProposedHours,
        timelineDeltaDays,
        proposedDeliverables: deliverables,
      });
    }
    onClose();
  };

  const handleApproveAndExecute = async () => {
    if (!title.trim() || deliverables.length === 0) return;

    let targetId = existingDraft?.id;

    if (!targetId) {
      const created = await createMutation.mutateAsync({
        scopeAnalysisId,
        driftAnalysisId: driftAnalysisId || null,
        title: title.trim(),
        description: description.trim() || null,
        additionalBudget,
        additionalHours: totalProposedHours,
        timelineDeltaDays,
        proposedDeliverables: deliverables,
      });
      targetId = created.id;
    } else {
      await updateMutation.mutateAsync({
        changeOrderId: targetId,
        data: {
          title: title.trim(),
          description: description.trim() || null,
          additionalBudget,
          additionalHours: totalProposedHours,
          timelineDeltaDays,
          proposedDeliverables: deliverables,
        },
      });
    }

    await approveMutation.mutateAsync({
      changeOrderId: targetId,
      data: {
        dueDate: invoiceDueDate,
        notes: invoiceNotes || undefined,
      },
    });

    onClose();
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    approveMutation.isPending;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
      title={
        isEditing
          ? `Edit Change Order: ${existingDraft?.changeOrderNumber}`
          : "Change Order Proposal"
      }
      description="Formalize scope adjustments, update operational milestones, and generate a dedicated change-order invoice."
      className="max-w-2xl"
    >
      <div className="space-y-5 text-left pt-1">
        {/* Title & Description */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[var(--color-ink-deep)]">
              Change Order Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scope Expansion: WhatsApp Notifications"
              className="mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--color-hairline-strong)] bg-white px-3 py-2 text-xs text-[var(--color-ink-deep)] focus:border-[var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-ink-deep)]">
              Rationale / Client Request Context
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of why this change was requested and agreed upon..."
              className="mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--color-hairline-strong)] bg-white px-3 py-2 text-xs text-[var(--color-ink-deep)] focus:border-[var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)] leading-relaxed"
            />
          </div>
        </div>

        {/* Proposed Deliverables Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--color-ink-deep)] flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[var(--color-yellow-dark)]" />
              <span>
                Proposed Milestones / Deliverables ({deliverables.length})
              </span>
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddDeliverable}
              className="rounded-full text-[11px] h-7 px-2.5 flex items-center gap-1"
            >
              <Plus size={12} /> Add Deliverable
            </Button>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] p-2 space-y-2 max-h-52 overflow-y-auto">
            {deliverables.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-white p-2 rounded-[var(--radius-md)] border border-[var(--color-hairline)] shadow-2xs"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      handleDeliverableChange(idx, "title", e.target.value)
                    }
                    placeholder="Deliverable title"
                    className="w-full text-xs font-medium text-[var(--color-ink-deep)] bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
                  />
                </div>
                <div className="flex items-center gap-1.5 w-24">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.estimatedHours}
                    onChange={(e) =>
                      handleDeliverableChange(
                        idx,
                        "estimatedHours",
                        Number(e.target.value),
                      )
                    }
                    className="w-12 text-xs text-right border border-[var(--color-hairline)] rounded px-1.5 py-0.5"
                  />
                  <span className="text-[11px] text-[var(--color-slate-text)]">
                    hrs
                  </span>
                </div>
                <select
                  value={item.complexity || "medium"}
                  onChange={(e) =>
                    handleDeliverableChange(idx, "complexity", e.target.value)
                  }
                  className="text-[11px] text-[var(--color-charcoal)] border border-[var(--color-hairline)] rounded px-1.5 py-0.5 bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Med</option>
                  <option value="high">High</option>
                </select>
                {deliverables.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliverable(idx)}
                    className="text-[var(--color-slate-text)] hover:text-[var(--color-coral-dark)] p-1 transition-colors"
                  >
                    <Trash size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Financial & Timeline Deltas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-hairline-soft)] bg-white space-y-1.5">
            <label className="block text-xs font-bold text-[var(--color-ink-deep)] flex items-center gap-1.5">
              <CurrencyDollar className="h-3.5 w-3.5 text-[var(--color-emerald-dark)]" />
              <span>Additional Price ({projectCurrency})</span>
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={additionalBudget}
              onChange={(e) => setAdditionalBudget(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-ink-deep)] focus:border-[var(--color-brand-blue)] focus:outline-none"
            />
            <p className="text-[11px] text-[var(--color-slate-text)]">
              Total additional effort:{" "}
              <strong>{totalProposedHours} hours</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-hairline-soft)] bg-white space-y-1.5">
            <label className="block text-xs font-bold text-[var(--color-ink-deep)] flex items-center gap-1.5">
              <CalendarBlank className="h-3.5 w-3.5 text-[var(--color-brand-blue)]" />
              <span>Timeline Delta (Days)</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={timelineDeltaDays}
              onChange={(e) => setTimelineDeltaDays(Number(e.target.value))}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-ink-deep)] focus:border-[var(--color-brand-blue)] focus:outline-none"
            />
            <p className="text-[11px] text-[var(--color-slate-text)]">
              Extends delivery date by <strong>{timelineDeltaDays} days</strong>
            </p>
          </div>
        </div>

        {/* Operational Impact Comparison Summary */}
        <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)] flex items-center gap-1">
            <Sparkle size={12} className="text-[var(--color-brand-yellow)]" />
            <span>Impact on Project Hub</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
            <div>
              <span className="text-[var(--color-slate-text)] block text-[11px]">
                Total Project Budget
              </span>
              <span className="text-[var(--color-slate-text)] line-through mr-1.5">
                {projectCurrency} {currentBudgetNum.toLocaleString("en-IN")}
              </span>
              <span className="font-bold text-[var(--color-emerald-dark)]">
                → {projectCurrency}{" "}
                {Number(newProjectBudget).toLocaleString("en-IN")}
              </span>
            </div>

            <div>
              <span className="text-[var(--color-slate-text)] block text-[11px]">
                Completion Deadline
              </span>
              <span className="text-[var(--color-slate-text)] line-through mr-1.5">
                {projectTargetDate || "None"}
              </span>
              <span className="font-bold text-[var(--color-brand-blue)]">
                → {newTargetDate}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-yellow-light)]/40 border border-[var(--color-brand-yellow)]/30 flex items-start gap-2 text-xs">
          <Receipt
            size={16}
            className="text-[var(--color-yellow-dark)] mt-0.5 shrink-0"
          />
          <div className="space-y-0.5 text-[11px] text-[var(--color-charcoal)]">
            <strong className="text-[var(--color-ink-deep)] block">
              Automated Change-Order Invoice Generation
            </strong>
            Approving this change order will automatically create a dedicated
            invoice for{" "}
            <strong>
              {projectCurrency}{" "}
              {Number(additionalBudget).toLocaleString("en-IN")}
            </strong>{" "}
            itemizing the new deliverables. Previous invoices and original scope
            remains unchanged.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-hairline-soft)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full shadow-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isPending || !title.trim() || deliverables.length === 0}
            className="rounded-full shadow-xs"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <SpinnerGap className="animate-spin mr-1" size={14} />
            ) : null}
            Save Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApproveAndExecute}
            disabled={isPending || !title.trim() || deliverables.length === 0}
            className="rounded-full shadow-xs flex items-center gap-1.5"
          >
            {approveMutation.isPending ? (
              <SpinnerGap className="animate-spin" size={14} />
            ) : (
              <CheckCircle size={14} weight="bold" />
            )}
            Approve &amp; Generate Invoice
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
