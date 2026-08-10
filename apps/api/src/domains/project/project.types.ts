import type { PricingModel, Project, ProjectStatus } from "@repo/database";

export interface ProjectResponse {
  id: string;
  workspaceId: string;
  clientId: string | null;
  clientName?: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  pricingModel: PricingModel;
  budgetCurrency: string;
  budgetAmount: string | null;
  startDate: string | null;
  targetDate: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
}

export interface CreateProjectServiceInput {
  name: string;
  slug?: string;
  clientId?: string | null;
  description?: string | null;
  pricingModel?: PricingModel;
  budgetCurrency?: string;
  budgetAmount?: number | null;
  startDate?: string | null;
  targetDate?: string | null;
}

export interface UpdateProjectServiceInput {
  name?: string;
  slug?: string;
  clientId?: string | null;
  description?: string | null;
  pricingModel?: PricingModel;
  budgetCurrency?: string;
  budgetAmount?: number | null;
  startDate?: string | null;
  targetDate?: string | null;
  status?: ProjectStatus;
}

export interface ChangeProjectStatusServiceInput {
  status: ProjectStatus;
}

export interface CreateProjectRepositoryInput
  extends CreateProjectServiceInput {
  workspaceId: string;
  slug: string;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateProjectRepositoryInput
  extends UpdateProjectServiceInput {
  updatedBy: string;
  completedAt?: Date | null;
}

export interface ProjectQueryFilters {
  workspaceId: string;
  clientId?: string;
  status?: ProjectStatus | "all";
  excludeDeleted?: boolean;
  search?: string;
}
