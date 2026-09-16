"use client";

import type { InvoiceStatus } from "@features/invoice/api";
import { useInvoices } from "@features/invoice/hooks";
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  CurrencyDollar,
  Receipt,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@shared/components/Button";
import Link from "next/link";
import type React from "react";
import { useMemo, useState } from "react";
import type { ProjectDeliverable } from "../api";
import { CreateProgressInvoiceModal } from "./CreateProgressInvoiceModal";

interface ProjectFinancialsCardProps {
  workspaceId: string;
  projectId: string;
  budgetAmount?: string | number | null;
  budgetCurrency?: string | null;
  deliverables: ProjectDeliverable[];
}

export const ProjectFinancialsCard: React.FC<ProjectFinancialsCardProps> = ({
  workspaceId,
  projectId,
  budgetAmount,
  budgetCurrency = "USD",
  deliverables,
}) => {
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const { data: invoices = [], isLoading } = useInvoices(workspaceId, {
    projectId,
  });

  const currency = budgetCurrency || "USD";
  const numericBudget = Number(budgetAmount || 0);

  // Financial aggregates calculated from linked invoices
  const { totalInvoiced, totalPaid, outstanding } = useMemo(() => {
    let invoiced = 0;
    let paid = 0;

    for (const inv of invoices) {
      if (inv.status !== "cancelled") {
        invoiced += Number(inv.totalAmount || 0);
        paid += Number(inv.amountPaid || 0);
      }
    }

    return {
      totalInvoiced: invoiced,
      totalPaid: paid,
      outstanding: Math.max(0, invoiced - paid),
    };
  }, [invoices]);

  const getInvoiceStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-teal-light)] text-[var(--color-brand-teal)]">
            <CheckCircle className="h-3 w-3" weight="fill" /> Paid
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)]">
            <Clock className="h-3 w-3" weight="bold" /> Sent
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-error-bg)] text-[var(--color-error)]">
            <WarningCircle className="h-3 w-3" weight="fill" /> Overdue
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-surface-soft)] text-[var(--color-slate-text)]">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)]">
            Draft
          </span>
        );
    }
  };

  const completedUnbilledCount = useMemo(() => {
    return deliverables.filter((d) => d.status === "completed" && !d.billedAt)
      .length;
  }, [deliverables]);

  return (
    <div className="rounded-[var(--radius-xl)] bg-white border border-[var(--color-hairline-soft)] shadow-[var(--shadow-card)] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-hairline-soft)]">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-ink-deep)] flex items-center gap-2">
            <CurrencyDollar className="h-5 w-5 text-[var(--color-brand-teal)]" />
            <span>Project Financials & Invoices</span>
          </h2>
          <p className="text-xs text-[var(--color-slate-text)] mt-0.5">
            Track deposit billings, progress milestones, and client payment
            collection.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsInvoiceModalOpen(true)}
          className="rounded-full text-xs font-semibold gap-1.5"
        >
          <Receipt className="h-3.5 w-3.5" weight="bold" />
          <span>Create Progress Invoice</span>
          {completedUnbilledCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white text-[var(--color-brand-teal)] text-[10px] font-bold">
              {completedUnbilledCount} ready
            </span>
          )}
        </Button>
      </div>

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] border border-[var(--color-hairline-soft)]">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
            Total Budget
          </span>
          <p className="font-mono font-bold text-lg text-[var(--color-ink-deep)]">
            {currency}{" "}
            {numericBudget.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
            Total Invoiced
          </span>
          <p className="font-mono font-bold text-lg text-[var(--color-ink-deep)]">
            {currency}{" "}
            {totalInvoiced.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
            Total Paid
          </span>
          <p className="font-mono font-bold text-lg text-[var(--color-moss-dark)]">
            {currency}{" "}
            {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
            Outstanding Due
          </span>
          <p className="font-mono font-bold text-lg text-[var(--color-yellow-dark)]">
            {currency}{" "}
            {outstanding.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Linked Invoices Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
          Linked Invoices ({invoices.length})
        </h3>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-[var(--color-slate-text)] font-medium">
            Loading project invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-slate-text)] border border-dashed border-[var(--color-hairline)] rounded-[var(--radius-lg)] p-4">
            No invoices linked to this project yet. Use &quot;Create Progress
            Invoice&quot; to bill completed deliverables.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--color-hairline-soft)] rounded-[var(--radius-lg)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-surface-soft)] text-[var(--color-slate-text)] font-bold uppercase tracking-wider border-b border-[var(--color-hairline-soft)]">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Total Amount</th>
                  <th className="py-2.5 px-4">Amount Paid</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-hairline-soft)]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[var(--color-surface-soft)]/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[var(--color-ink-deep)]">
                      {inv.invoiceNumber || "Draft"}
                    </td>
                    <td className="py-3 px-4">
                      {getInvoiceStatusBadge(inv.status)}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[var(--color-ink-deep)]">
                      {inv.currency}{" "}
                      {Number(inv.totalAmount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--color-slate-text)]">
                      {inv.currency}{" "}
                      {Number(inv.amountPaid || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-slate-text)]">
                      {inv.dueDate || "Not set"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/workspaces/${workspaceId}/invoices`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-blue)] hover:underline"
                      >
                        <span>View</span>
                        <ArrowSquareOut className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Progress Invoice Modal */}
      <CreateProgressInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        workspaceId={workspaceId}
        projectId={projectId}
        projectBudget={numericBudget}
        projectCurrency={currency}
        deliverables={deliverables}
      />
    </div>
  );
};
