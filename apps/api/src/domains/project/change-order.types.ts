import type { ChangeOrder, ProposedDeliverableItem } from "@repo/database";

export type { ChangeOrder, ProposedDeliverableItem };

export interface ProposedDeliverableItemInput {
  title: string;
  description?: string | null;
  estimatedHours: number;
  complexity?: "low" | "medium" | "high";
}

export interface CreateChangeOrderInput {
  scopeAnalysisId: string;
  driftAnalysisId?: string | null;
  title: string;
  description?: string | null;
  additionalBudget: number | string;
  additionalHours: number | string;
  timelineDeltaDays?: number;
  proposedDeliverables: ProposedDeliverableItemInput[];
}

export interface UpdateChangeOrderDraftInput {
  title?: string;
  description?: string | null;
  additionalBudget?: number | string;
  additionalHours?: number | string;
  timelineDeltaDays?: number;
  proposedDeliverables?: ProposedDeliverableItemInput[];
}

export interface ApproveChangeOrderInput {
  dueDate?: string | null;
  notes?: string | null;
}

export interface ChangeOrderResponseDTO {
  changeOrder: ChangeOrder;
  projectUpdated?: {
    budgetAmount: string | null;
    targetDate: string | null;
  };
  invoiceCreated?: {
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    status: string;
  };
}
