import type { Project } from "@repo/database";
import type { ProjectResponse } from "./project.types";

export function mapProjectToResponse(
  project: Project & { clientName?: string | null },
): ProjectResponse {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    clientId: project.clientId,
    clientName: project.clientName !== undefined ? project.clientName : null,
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    pricingModel: project.pricingModel,
    budgetCurrency: project.budgetCurrency,
    budgetAmount: project.budgetAmount,
    startDate: project.startDate,
    targetDate: project.targetDate,
    completedAt: project.completedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    createdBy: project.createdBy,
    updatedBy: project.updatedBy,
    deletedAt: project.deletedAt,
  };
}

export function mapProjectsToResponse(
  projects: Array<Project & { clientName?: string | null }>,
): ProjectResponse[] {
  return projects.map(mapProjectToResponse);
}
