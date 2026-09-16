import type {
  ProjectDeliverable,
  ProjectDeliverableStatus,
} from "@repo/database";

export interface ProjectProgressDTO {
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  completionPercentage: number;
  totalEstimatedHours: number;
  totalLoggedHours: number;
  remainingHours: number;
}

export interface ProjectDeliverablesResponseDTO {
  deliverables: ProjectDeliverable[];
  progress: ProjectProgressDTO;
}

export interface CreateProjectDeliverableServiceInput {
  title: string;
  description?: string | null;
  estimatedHours?: number | string;
  complexity?: "low" | "medium" | "high";
  position?: number;
}

export interface UpdateProjectDeliverableServiceInput {
  title?: string;
  description?: string | null;
  estimatedHours?: number | string;
  loggedHours?: number | string;
  complexity?: "low" | "medium" | "high";
  status?: ProjectDeliverableStatus;
  position?: number;
}

export interface CreateProgressInvoiceServiceInput {
  deliverableIds: string[];
  dueDate?: string | null;
  notes?: string | null;
  discountRate?: string | number;
  taxRate?: string | number;
}
