export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived';
export type PricingModel = 'fixed' | 'hourly' | 'retainer';

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
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateProjectInput {
  name: string;
  clientId?: string | null;
  description?: string | null;
  pricingModel?: PricingModel;
  budgetCurrency?: string;
  budgetAmount?: number | null;
  startDate?: string | null;
  targetDate?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  clientId?: string | null;
  description?: string | null;
  pricingModel?: PricingModel;
  budgetCurrency?: string;
  budgetAmount?: number | null;
  startDate?: string | null;
  targetDate?: string | null;
  status?: ProjectStatus;
}

export interface ChangeProjectStatusInput {
  status: ProjectStatus;
}

export interface ListProjectsFilters {
  status?: ProjectStatus | 'all';
  clientId?: string;
  excludeDeleted?: boolean;
  search?: string;
}
