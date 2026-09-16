import { apiDelete, apiGet, apiPatch, apiPost } from "@api/client";
import type { InvoiceResponse } from "@features/invoice/api";

export type DeliverableComplexity = "low" | "medium" | "high";
export type DeliverableStatus = "pending" | "in_progress" | "completed";

export interface ProjectDeliverable {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  estimatedHours: string;
  loggedHours: string;
  complexity: DeliverableComplexity;
  status: DeliverableStatus;
  position: number;
  sourceScopeId: string | null;
  invoiceId: string | null;
  billedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProgress {
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  completionPercentage: number;
  totalEstimatedHours: number;
  totalLoggedHours: number;
  remainingHours: number;
}

export interface ProjectDeliverablesResponse {
  deliverables: ProjectDeliverable[];
  progress: ProjectProgress;
}

export interface CreateProjectDeliverableInput {
  title: string;
  description?: string | null;
  estimatedHours?: number | string;
  complexity?: DeliverableComplexity;
  position?: number;
}

export interface UpdateProjectDeliverableInput {
  title?: string;
  description?: string | null;
  estimatedHours?: number | string;
  loggedHours?: number | string;
  complexity?: DeliverableComplexity;
  status?: DeliverableStatus;
  position?: number;
}

export interface CreateProgressInvoiceInput {
  deliverableIds: string[];
  dueDate?: string | null;
  notes?: string | null;
  discountRate?: string | number;
  taxRate?: string | number;
}

export interface CreateProgressInvoiceResponse {
  invoice: InvoiceResponse;
  billedDeliverables: ProjectDeliverable[];
}

export async function getProjectDeliverables(
  workspaceId: string,
  projectId: string,
): Promise<ProjectDeliverablesResponse> {
  return apiGet<ProjectDeliverablesResponse>(
    `/workspaces/${workspaceId}/projects/${projectId}/deliverables`,
  );
}

export async function createProjectDeliverable(
  workspaceId: string,
  projectId: string,
  data: CreateProjectDeliverableInput,
): Promise<ProjectDeliverable> {
  return apiPost<ProjectDeliverable>(
    `/workspaces/${workspaceId}/projects/${projectId}/deliverables`,
    data,
  );
}

export async function updateProjectDeliverable(
  workspaceId: string,
  projectId: string,
  deliverableId: string,
  data: UpdateProjectDeliverableInput,
): Promise<ProjectDeliverable> {
  return apiPatch<ProjectDeliverable>(
    `/workspaces/${workspaceId}/projects/${projectId}/deliverables/${deliverableId}`,
    data,
  );
}

export async function deleteProjectDeliverable(
  workspaceId: string,
  projectId: string,
  deliverableId: string,
): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(
    `/workspaces/${workspaceId}/projects/${projectId}/deliverables/${deliverableId}`,
  );
}

export async function createProgressInvoice(
  workspaceId: string,
  projectId: string,
  data: CreateProgressInvoiceInput,
): Promise<CreateProgressInvoiceResponse> {
  return apiPost<CreateProgressInvoiceResponse>(
    `/workspaces/${workspaceId}/projects/${projectId}/invoices/progress`,
    data,
  );
}

export async function backfillProjectDeliverables(
  workspaceId: string,
  projectId: string,
): Promise<{
  count: number;
  deliverables: ProjectDeliverable[];
  message: string;
}> {
  return apiPost<{
    count: number;
    deliverables: ProjectDeliverable[];
    message: string;
  }>(
    `/workspaces/${workspaceId}/projects/${projectId}/deliverables/backfill`,
    {},
  );
}
