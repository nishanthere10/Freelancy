import { type Project, clientsTable, projectsTable } from "@repo/database";
import { and, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "../../../db/client";
import type {
  CreateProjectRepositoryInput,
  ProjectQueryFilters,
  UpdateProjectRepositoryInput,
} from "../project.types";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class ProjectRepository {
  async create(data: CreateProjectRepositoryInput): Promise<Project> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Project name cannot be empty");
    }
    if (!data.workspaceId) {
      throw new Error("Workspace ID is required");
    }

    const slug = data.slug || slugify(data.name);

    try {
      const [project] = await db
        .insert(projectsTable)
        .values({
          workspaceId: data.workspaceId,
          clientId: data.clientId || null,
          name: data.name.trim(),
          slug,
          description: data.description?.trim() || null,
          pricingModel: data.pricingModel || "fixed",
          budgetCurrency: data.budgetCurrency?.toUpperCase().trim() || "INR",
          budgetAmount:
            data.budgetAmount !== undefined && data.budgetAmount !== null
              ? String(data.budgetAmount)
              : null,
          startDate: data.startDate || null,
          targetDate: data.targetDate || null,
          status: "draft",
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
        })
        .returning();

      if (!project) {
        throw new Error("Failed to create project");
      }

      return project;
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (
        pgError.code === "23505" &&
        pgError.constraint === "idx_projects_workspace_slug"
      ) {
        throw new Error(
          "A project with this slug already exists in this workspace",
        );
      }
      if (
        pgError.code === "23503" &&
        pgError.constraint === "fk_projects_workspace_client"
      ) {
        throw new Error(
          "Client does not exist or does not belong to this workspace",
        );
      }
      throw error;
    }
  }

  async getById(
    id: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<(Project & { clientName?: string | null }) | null> {
    const conditions = [
      eq(projectsTable.id, id),
      eq(projectsTable.workspaceId, workspaceId),
    ];

    if (!options?.includeDeleted) {
      conditions.push(isNull(projectsTable.deletedAt));
    }

    const [result] = await db
      .select({
        project: projectsTable,
        clientName: clientsTable.name,
      })
      .from(projectsTable)
      .leftJoin(
        clientsTable,
        and(
          eq(projectsTable.clientId, clientsTable.id),
          eq(projectsTable.workspaceId, clientsTable.workspaceId),
        ),
      )
      .where(and(...conditions));

    if (!result) return null;

    return {
      ...result.project,
      clientName: result.clientName || null,
    };
  }

  async getBySlug(
    slug: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Project | null> {
    const conditions = [
      eq(projectsTable.slug, slug),
      eq(projectsTable.workspaceId, workspaceId),
    ];

    if (!options?.includeDeleted) {
      conditions.push(isNull(projectsTable.deletedAt));
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(...conditions));

    return project || null;
  }

  async list(
    filters: ProjectQueryFilters,
  ): Promise<Array<Project & { clientName?: string | null }>> {
    const conditions = [eq(projectsTable.workspaceId, filters.workspaceId)];

    if (filters.clientId) {
      conditions.push(eq(projectsTable.clientId, filters.clientId));
    }

    if (filters.status && filters.status !== "all") {
      conditions.push(eq(projectsTable.status, filters.status));
    }

    if (filters.excludeDeleted !== false) {
      conditions.push(isNull(projectsTable.deletedAt));
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = `%${filters.search.trim()}%`;
      const searchCond = or(
        ilike(projectsTable.name, term),
        ilike(projectsTable.description, term),
        ilike(clientsTable.name, term),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const results = await db
      .select({
        project: projectsTable,
        clientName: clientsTable.name,
      })
      .from(projectsTable)
      .leftJoin(
        clientsTable,
        and(
          eq(projectsTable.clientId, clientsTable.id),
          eq(projectsTable.workspaceId, clientsTable.workspaceId),
        ),
      )
      .where(and(...conditions))
      .orderBy(projectsTable.updatedAt);

    return results.map((r) => ({
      ...r.project,
      clientName: r.clientName || null,
    }));
  }

  async update(
    id: string,
    workspaceId: string,
    data: UpdateProjectRepositoryInput,
  ): Promise<Project> {
    const updateData: Partial<typeof projectsTable.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: data.updatedBy,
    };

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.slug !== undefined) updateData.slug = data.slug.trim();
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.pricingModel !== undefined)
      updateData.pricingModel = data.pricingModel;
    if (data.budgetCurrency !== undefined)
      updateData.budgetCurrency = data.budgetCurrency.toUpperCase().trim();
    if (data.budgetAmount !== undefined) {
      updateData.budgetAmount =
        data.budgetAmount !== null ? String(data.budgetAmount) : null;
    }
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.completedAt !== undefined)
      updateData.completedAt = data.completedAt;

    try {
      const [project] = await db
        .update(projectsTable)
        .set(updateData)
        .where(
          and(
            eq(projectsTable.id, id),
            eq(projectsTable.workspaceId, workspaceId),
            isNull(projectsTable.deletedAt),
          ),
        )
        .returning();

      if (!project) {
        throw new Error(`Project with ID ${id} not found or already archived`);
      }

      return project;
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (
        pgError.code === "23505" &&
        pgError.constraint === "idx_projects_workspace_slug"
      ) {
        throw new Error(
          "A project with this slug already exists in this workspace",
        );
      }
      if (
        pgError.code === "23503" &&
        pgError.constraint === "fk_projects_workspace_client"
      ) {
        throw new Error(
          "Client does not exist or does not belong to this workspace",
        );
      }
      throw error;
    }
  }

  async softDelete(
    id: string,
    workspaceId: string,
    deletedBy: string,
  ): Promise<Project> {
    const [project] = await db
      .update(projectsTable)
      .set({
        deletedAt: new Date(),
        status: "archived",
        updatedBy: deletedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectsTable.id, id),
          eq(projectsTable.workspaceId, workspaceId),
          isNull(projectsTable.deletedAt),
        ),
      )
      .returning();

    if (!project) {
      throw new Error(`Project with ID ${id} not found or already archived`);
    }

    return project;
  }

  async restore(
    id: string,
    workspaceId: string,
    restoredBy: string,
  ): Promise<Project> {
    const [project] = await db
      .update(projectsTable)
      .set({
        deletedAt: null,
        status: "active",
        updatedBy: restoredBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectsTable.id, id),
          eq(projectsTable.workspaceId, workspaceId),
          isNotNull(projectsTable.deletedAt),
        ),
      )
      .returning();

    if (!project) {
      throw new Error(`Archived project with ID ${id} not found`);
    }

    return project;
  }
}
