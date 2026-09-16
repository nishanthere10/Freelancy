"use client";

import {
  ArrowRight,
  ArrowsClockwise,
  CalendarBlank,
  CheckCircle,
  Clock,
  CurrencyDollar,
  FileText,
  Plus,
  Receipt,
  XCircle,
} from "@phosphor-icons/react";
import { Button } from "@shared/components/Button";
import { Card } from "@shared/components/Card";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import type { ChangeOrder } from "../api";
import {
  useChangeOrders,
  useRejectChangeOrder,
} from "../hooks/useChangeOrders";
import { ChangeOrderProposalModal } from "./ChangeOrderProposalModal";

interface ProjectChangeOrdersCardProps {
  workspaceId: string;
  projectId: string;
  scopeAnalysisId?: string | null;
  projectBudget?: string | null;
  projectCurrency?: string;
  projectTargetDate?: string | null;
}

export const ProjectChangeOrdersCard: React.FC<
  ProjectChangeOrdersCardProps
> = ({
  workspaceId,
  projectId,
  scopeAnalysisId,
  projectBudget,
  projectCurrency = "INR",
  projectTargetDate,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<ChangeOrder | null>(null);

  const {
    data: changeOrders = [],
    isLoading,
    error,
  } = useChangeOrders(workspaceId, projectId);
  const rejectMutation = useRejectChangeOrder(workspaceId, projectId);

  const handleOpenNewModal = () => {
    setSelectedDraft(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (co: ChangeOrder) => {
    setSelectedDraft(co);
    setIsModalOpen(true);
  };

  const totalApprovedBudgetDelta = changeOrders
    .filter((co) => co.status === "approved")
    .reduce((sum, co) => sum + (Number(co.additionalBudget) || 0), 0);

  const totalApprovedDaysDelta = changeOrders
    .filter((co) => co.status === "approved")
    .reduce((sum, co) => sum + (co.timelineDeltaDays || 0), 0);

  const renderStatusBadge = (status: ChangeOrder["status"]) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-[var(--color-emerald-light)] text-[var(--color-emerald-dark)]">
            <CheckCircle size={10} weight="bold" />
            Approved
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)]">
            <Clock size={10} weight="bold" />
            Draft
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-[var(--color-coral-light)] text-[var(--color-coral-dark)]">
            <XCircle size={10} weight="bold" />
            Rejected
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-[var(--color-surface-soft)] text-[var(--color-slate-text)]">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="p-6 rounded-[var(--radius-xl)] bg-white border border-[var(--color-hairline-soft)] shadow-[var(--shadow-card)] space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-hairline-soft)]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)]">
                <FileText className="h-4 w-4" weight="bold" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-ink-deep)]">
                Change Orders &amp; Scope Adjustments
              </h3>
              {changeOrders.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-soft)] text-[var(--color-charcoal)]">
                  {changeOrders.length}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-slate-text)]">
              Track approved scope additions, budget increases, and dedicated
              invoices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {scopeAnalysisId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenNewModal}
                className="rounded-full text-xs font-bold gap-1 shadow-xs"
              >
                <Plus size={12} weight="bold" />
                <span>New Change Order</span>
              </Button>
            )}
          </div>
        </div>

        {/* Aggregate Stats if Approved Orders Exist */}
        {totalApprovedBudgetDelta > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-xs">
            <div>
              <span className="text-[11px] text-[var(--color-slate-text)] block">
                Total Approved Scope Expansion
              </span>
              <span className="font-bold text-[var(--color-emerald-dark)]">
                +{projectCurrency}{" "}
                {totalApprovedBudgetDelta.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[var(--color-slate-text)] block">
                Total Delivery Extension
              </span>
              <span className="font-bold text-[var(--color-brand-blue)]">
                +{totalApprovedDaysDelta} days
              </span>
            </div>
            <div className="hidden sm:block">
              <span className="text-[11px] text-[var(--color-slate-text)] block">
                Approved Change Orders
              </span>
              <span className="font-bold text-[var(--color-ink-deep)]">
                {changeOrders.filter((co) => co.status === "approved").length}{" "}
                orders
              </span>
            </div>
          </div>
        )}

        {/* Change Orders List */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-[var(--color-slate-text)] flex items-center justify-center gap-2">
            <ArrowsClockwise className="animate-spin" size={16} /> Loading
            change orders...
          </div>
        ) : error ? (
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-coral-light)]/40 text-[var(--color-coral-dark)] text-xs">
            Failed to load change orders.
          </div>
        ) : changeOrders.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-hairline-strong)] space-y-2">
            <FileText className="h-8 w-8 mx-auto text-[var(--color-steel)]" />
            <div className="text-xs font-bold text-[var(--color-ink-deep)]">
              No Change Orders Recorded
            </div>
            <p className="text-[11px] text-[var(--color-slate-text)] max-w-sm mx-auto">
              When out-of-scope work is requested or negotiated, convert Scope
              Drift into an approved Change Order to update budget, timeline,
              and invoice.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-hairline-soft)]">
            {changeOrders.map((co) => (
              <div
                key={co.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--color-ink-deep)]">
                      {co.changeOrderNumber}
                    </span>
                    <span className="text-[var(--color-slate-text)]">•</span>
                    <span className="font-medium text-[var(--color-ink-deep)]">
                      {co.title}
                    </span>
                    {renderStatusBadge(co.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-slate-text)]">
                    <span className="flex items-center gap-1 font-semibold text-[var(--color-emerald-dark)]">
                      <CurrencyDollar size={12} /> +{projectCurrency}{" "}
                      {Number(co.additionalBudget).toLocaleString("en-IN")}
                    </span>
                    {co.timelineDeltaDays > 0 && (
                      <span className="flex items-center gap-1 text-[var(--color-brand-blue)]">
                        <CalendarBlank size={12} /> +{co.timelineDeltaDays} days
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> +{co.additionalHours} hrs
                    </span>
                    <span>
                      {co.proposedDeliverables?.length || 0} milestone(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {co.status === "draft" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEditModal(co)}
                        className="rounded-full text-[11px] h-7 px-2.5 font-bold"
                      >
                        Review &amp; Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => rejectMutation.mutate(co.id)}
                        disabled={rejectMutation.isPending}
                        className="rounded-full text-[11px] h-7 px-2 text-[var(--color-coral-dark)]"
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {co.status === "approved" && co.invoiceId && (
                    <Link
                      href={`/workspaces/${workspaceId}/invoices/${co.invoiceId}`}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-[var(--color-surface-soft)] text-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/10 transition-colors"
                    >
                      <Receipt size={12} /> View Invoice{" "}
                      <ArrowRight size={10} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Change Order Proposal Modal */}
      {scopeAnalysisId && isModalOpen && (
        <ChangeOrderProposalModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDraft(null);
          }}
          workspaceId={workspaceId}
          projectId={projectId}
          scopeAnalysisId={scopeAnalysisId}
          projectBudget={projectBudget}
          projectCurrency={projectCurrency}
          projectTargetDate={projectTargetDate}
          existingDraft={selectedDraft}
        />
      )}
    </>
  );
};
