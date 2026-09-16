import { apiGet, apiPatch, apiPost } from "@api/client";

export type ChangeOrderStatus = "draft" | "approved" | "rejected" | "cancelled";

export interface ProposedDeliverableItem {
  title: string;
  description?: string | null;
  estimatedHours: number;
  complexity?: "low" | "medium" | "high";
}

export interface ChangeOrder {
  id: string;
  workspaceId: string;
  projectId: string;
  scopeAnalysisId: string;
  driftAnalysisId?: string | null;
  invoiceId?: string | null;
  changeOrderNumber: string;
  title: string;
  description?: string | null;
  status: ChangeOrderStatus;
  additionalBudget: string;
  additionalHours: string;
  timelineDeltaDays: number;
  proposedDeliverables: ProposedDeliverableItem[];
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChangeOrderInput {
  scopeAnalysisId: string;
  driftAnalysisId?: string | null;
  title: string;
  description?: string | null;
  additionalBudget?: number | string;
  additionalHours?: number | string;
  timelineDeltaDays?: number;
  proposedDeliverables: ProposedDeliverableItem[];
}

export interface UpdateChangeOrderDraftInput {
  title?: string;
  description?: string | null;
  additionalBudget?: number | string;
  additionalHours?: number | string;
  timelineDeltaDays?: number;
  proposedDeliverables?: ProposedDeliverableItem[];
}

export interface ApproveChangeOrderInput {
  dueDate?: string | null;
  notes?: string | null;
}

export interface ChangeOrderResponse {
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

export async function getProjectChangeOrders(
  workspaceId: string,
  projectId: string,
): Promise<ChangeOrder[]> {
  return apiGet<ChangeOrder[]>(
    `/workspaces/${workspaceId}/projects/${projectId}/change-orders`,
  );
}

export async function getChangeOrder(
  workspaceId: string,
  projectId: string,
  changeOrderId: string,
): Promise<ChangeOrder> {
  return apiGet<ChangeOrder>(
    `/workspaces/${workspaceId}/projects/${projectId}/change-orders/${changeOrderId}`,
  );
}

export async function createChangeOrder(
  workspaceId: string,
  projectId: string,
  data: CreateChangeOrderInput,
): Promise<ChangeOrder> {
  return apiPost<ChangeOrder>(
    `/workspaces/${workspaceId}/projects/${projectId}/change-orders`,
    data,
  );
}

export async function updateChangeOrderDraft(
  workspaceId: string,
  projectId: string,
  changeOrderId: string,
  data: UpdateChangeOrderDraftInput,
): Promise<ChangeOrder> {
  return apiPatch<ChangeOrder>(
    `/workspaces/${workspaceId}/projects/${projectId}/change-orders/${changeOrderId}`,
    data,
  );
}

export async function approveChangeOrder(
  workspaceId: string,
  projectId: string,
  changeOrderId: string,
  data?: ApproveChangeOrderInput,
): Promise<ChangeOrderResponse> {
  return apiPost<ChangeOrderResponse>(
    `/workspaces/${workspaceId}/projects/${projectId}/change-orders/${changeOrderId}/approve`,
    data || {},
  );
}

export async function rejectChangeOrder(
  workspaceId: string,
  projectId: string,
  changeOrderId: string,
): Promise<ChangeOrder> {
  return apiPost<ChangeOrder>(
    `/workspaces/${workspaceId}/projects/${projectId}/change-orders/${changeOrderId}/reject`,
    {},
  );
}

export async function cancelChangeOrder(
  workspaceId: string,
  projectId: string,
  changeOrderId: string,
): Promise<ChangeOrder> {
  return apiPost<ChangeOrder>(
    `/workspaces/${workspaceId}/projects/${projectId}/change-orders/${changeOrderId}/cancel`,
    {},
  );
}
