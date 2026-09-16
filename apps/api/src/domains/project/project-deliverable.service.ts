import type { Project, ProjectDeliverable } from "@repo/database";
import { logger } from "../../utils/logger";
import type { ScopeAnalysisRepository } from "../ai/repository";
import { canCreateInvoice } from "../invoice/invoice.policies";
import type { InvoiceService } from "../invoice/invoice.service";
import { formatMoney } from "../invoice/invoice.service";
import type { InvoiceWithItems } from "../invoice/invoice.types";
import type { WorkspaceMemberRepository } from "../workspace/repository";
import {
  ProjectDeliverableNotFoundError,
  ProjectDeliverablePermissionDeniedError,
  ProjectDeliverableValidationError,
} from "./project-deliverable.errors";
import type {
  CreateProgressInvoiceServiceInput,
  CreateProjectDeliverableServiceInput,
  ProjectDeliverablesResponseDTO,
  ProjectProgressDTO,
  UpdateProjectDeliverableServiceInput,
} from "./project-deliverable.types";
import { canUpdateProject, canViewProject } from "./project.policies";
import type { ProjectDeliverableRepository } from "./repository/project-deliverable.repository";
import type { ProjectRepository } from "./repository/project.repository";

export type DeliverableResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error & { code?: string; statusCode?: number } };

function ok<T>(data: T): DeliverableResult<T> {
  return { success: true, data };
}

function err<T>(
  error: Error & { code?: string; statusCode?: number },
): DeliverableResult<T> {
  return { success: false, error };
}

export class ProjectDeliverableService {
  constructor(
    private readonly deliverableRepo: ProjectDeliverableRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly memberRepo: WorkspaceMemberRepository,
    private readonly invoiceService: InvoiceService | null,
    private readonly scopeAnalysisRepo: ScopeAnalysisRepository | null,
  ) {}

  /**
   * Deterministic Project Progress Computation
   */
  calculateProgress(deliverables: ProjectDeliverable[]): ProjectProgressDTO {
    const totalCount = deliverables.length;
    const completedCount = deliverables.filter(
      (d) => d.status === "completed",
    ).length;
    const inProgressCount = deliverables.filter(
      (d) => d.status === "in_progress",
    ).length;
    const pendingCount = deliverables.filter(
      (d) => d.status === "pending",
    ).length;

    const completionPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const totalEstimated = deliverables.reduce(
      (sum, d) => sum + Number(d.estimatedHours || 0),
      0,
    );
    const totalLogged = deliverables.reduce(
      (sum, d) => sum + Number(d.loggedHours || 0),
      0,
    );

    const totalEstimatedHours = Math.round(totalEstimated * 100) / 100;
    const totalLoggedHours = Math.round(totalLogged * 100) / 100;
    const remainingHours = Math.max(
      0,
      Math.round((totalEstimatedHours - totalLoggedHours) * 100) / 100,
    );

    return {
      totalCount,
      completedCount,
      inProgressCount,
      pendingCount,
      completionPercentage,
      totalEstimatedHours,
      totalLoggedHours,
      remainingHours,
    };
  }

  /**
   * Fetch project deliverables and deterministic progress.
   * STRICT INVARIANT: GET requests NEVER mutate database rows.
   */
  async listDeliverables(
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<DeliverableResult<ProjectDeliverablesResponseDTO>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canViewProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectDeliverablePermissionDeniedError(
            "view",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        const error = new Error(
          "Project not found in this workspace",
        ) as Error & {
          code?: string;
          statusCode?: number;
        };
        error.code = "PROJECT_NOT_FOUND";
        error.statusCode = 404;
        return err(error);
      }

      const deliverables = await this.deliverableRepo.listByProject(
        projectId,
        workspaceId,
      );
      const progress = this.calculateProgress(deliverables);

      return ok({
        deliverables,
        progress,
      });
    } catch (error: unknown) {
      logger.error("Failed to list project deliverables", {
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create a new deliverable inside an active project.
   */
  async createDeliverable(
    projectId: string,
    workspaceId: string,
    actorId: string,
    input: CreateProjectDeliverableServiceInput,
  ): Promise<DeliverableResult<ProjectDeliverable>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canUpdateProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectDeliverablePermissionDeniedError(
            "create",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        const error = new Error(
          "Project not found in this workspace",
        ) as Error & {
          code?: string;
          statusCode?: number;
        };
        error.code = "PROJECT_NOT_FOUND";
        error.statusCode = 404;
        return err(error);
      }

      const estimatedHoursNum = Number(input.estimatedHours ?? 0);
      if (Number.isNaN(estimatedHoursNum) || estimatedHoursNum < 0) {
        return err(
          new ProjectDeliverableValidationError(
            "Estimated hours must be non-negative",
          ),
        );
      }

      const deliverable = await this.deliverableRepo.create({
        workspaceId,
        projectId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        estimatedHours: estimatedHoursNum.toFixed(2),
        loggedHours: "0.00",
        complexity: input.complexity || "medium",
        status: "pending",
        position: input.position ?? 0,
      });

      return ok(deliverable);
    } catch (error: unknown) {
      logger.error("Failed to create project deliverable", {
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update an operational deliverable (Status transitions, hours, content).
   */
  async updateDeliverable(
    deliverableId: string,
    projectId: string,
    workspaceId: string,
    actorId: string,
    input: UpdateProjectDeliverableServiceInput,
  ): Promise<DeliverableResult<ProjectDeliverable>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canUpdateProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectDeliverablePermissionDeniedError(
            "update",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.deliverableRepo.getById(
        deliverableId,
        projectId,
        workspaceId,
      );
      if (!existing) {
        return err(new ProjectDeliverableNotFoundError(deliverableId));
      }

      const updateData: Partial<typeof existing> = {};

      if (input.title !== undefined) {
        if (!input.title.trim()) {
          return err(
            new ProjectDeliverableValidationError("Title cannot be empty"),
          );
        }
        updateData.title = input.title.trim();
      }

      if (input.description !== undefined) {
        updateData.description = input.description?.trim() || null;
      }

      if (input.complexity !== undefined) {
        updateData.complexity = input.complexity;
      }

      if (input.position !== undefined) {
        updateData.position = input.position;
      }

      // Hours validation: non-negative; overruns (logged > estimated) are explicitly allowed
      if (input.estimatedHours !== undefined) {
        const estNum = Number(input.estimatedHours);
        if (Number.isNaN(estNum) || estNum < 0) {
          return err(
            new ProjectDeliverableValidationError(
              "Estimated hours must be non-negative",
            ),
          );
        }
        updateData.estimatedHours = estNum.toFixed(2);
      }

      if (input.loggedHours !== undefined) {
        const loggedNum = Number(input.loggedHours);
        if (Number.isNaN(loggedNum) || loggedNum < 0) {
          return err(
            new ProjectDeliverableValidationError(
              "Logged hours must be non-negative",
            ),
          );
        }
        updateData.loggedHours = loggedNum.toFixed(2);
      }

      // Status transitions and completedAt lifecycle
      if (input.status !== undefined && input.status !== existing.status) {
        updateData.status = input.status;
        if (input.status === "completed") {
          updateData.completedAt = new Date();
        } else {
          // Reopening a completed milestone resets completedAt
          updateData.completedAt = null;
        }
      }

      const updated = await this.deliverableRepo.update(
        deliverableId,
        projectId,
        workspaceId,
        updateData,
      );

      if (!updated) {
        return err(new ProjectDeliverableNotFoundError(deliverableId));
      }

      return ok(updated);
    } catch (error: unknown) {
      logger.error("Failed to update project deliverable", {
        deliverableId,
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete an operational deliverable.
   */
  async deleteDeliverable(
    deliverableId: string,
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<DeliverableResult<boolean>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canUpdateProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectDeliverablePermissionDeniedError(
            "delete",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.deliverableRepo.getById(
        deliverableId,
        projectId,
        workspaceId,
      );
      if (!existing) {
        return err(new ProjectDeliverableNotFoundError(deliverableId));
      }

      const deleted = await this.deliverableRepo.delete(
        deliverableId,
        projectId,
        workspaceId,
      );

      return ok(deleted);
    } catch (error: unknown) {
      logger.error("Failed to delete project deliverable", {
        deliverableId,
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create an itemized Progress Invoice from completed deliverables.
   * Concurrency-safe: claims deliverables atomically to prevent duplicate billing.
   */
  async createProgressInvoice(
    projectId: string,
    workspaceId: string,
    actorId: string,
    input: CreateProgressInvoiceServiceInput,
  ): Promise<
    DeliverableResult<{
      invoice: InvoiceWithItems;
      billedDeliverables: ProjectDeliverable[];
    }>
  > {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canCreateInvoice(membership);
      if (!policy.allowed) {
        return err(
          new ProjectDeliverablePermissionDeniedError(
            "create progress invoice for",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      if (!this.invoiceService) {
        const error = new Error("Invoice service not available") as Error & {
          code?: string;
          statusCode?: number;
        };
        error.code = "SERVICE_UNAVAILABLE";
        error.statusCode = 503;
        return err(error);
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        const error = new Error(
          "Project not found in this workspace",
        ) as Error & {
          code?: string;
          statusCode?: number;
        };
        error.code = "PROJECT_NOT_FOUND";
        error.statusCode = 404;
        return err(error);
      }

      if (!project.clientId) {
        const error = new Error(
          "Project must be assigned to a client to generate a progress invoice",
        ) as Error & { code?: string; statusCode?: number };
        error.code = "CLIENT_REQUIRED";
        error.statusCode = 422;
        return err(error);
      }

      if (!input.deliverableIds || input.deliverableIds.length === 0) {
        return err(
          new ProjectDeliverableValidationError(
            "At least one deliverable must be selected for progress invoicing",
          ),
        );
      }

      // Fetch all deliverables of the project to calculate proportions and validate status
      const allDeliverables = await this.deliverableRepo.listByProject(
        projectId,
        workspaceId,
      );
      const deliverableMap = new Map(allDeliverables.map((d) => [d.id, d]));

      const selectedDeliverables: ProjectDeliverable[] = [];
      for (const id of input.deliverableIds) {
        const d = deliverableMap.get(id);
        if (!d) {
          return err(
            new ProjectDeliverableValidationError(
              `Deliverable '${id}' does not belong to this project`,
            ),
          );
        }
        if (d.status !== "completed") {
          return err(
            new ProjectDeliverableValidationError(
              `Deliverable '${d.title}' must be marked completed before invoicing`,
            ),
          );
        }
        if (d.billedAt || d.invoiceId) {
          const error = new Error(
            `Deliverable '${d.title}' has already been billed in an invoice`,
          ) as Error & { code?: string; statusCode?: number };
          error.code = "DELIVERABLE_ALREADY_BILLED";
          error.statusCode = 409;
          return err(error);
        }
        selectedDeliverables.push(d);
      }

      // Server-authoritative itemized financial pricing
      const totalBudget = Number(project.budgetAmount || 0);
      const totalProjectHours = allDeliverables.reduce(
        (sum, d) => sum + Math.max(1, Number(d.estimatedHours || 1)),
        0,
      );

      let items: Array<{
        description: string;
        quantity: string;
        unitPrice: string;
        sortOrder: number;
      }> = [];

      if (totalBudget > 0 && totalProjectHours > 0) {
        let allocated = 0;
        items = selectedDeliverables.map((d, idx) => {
          const hours = Math.max(1, Number(d.estimatedHours || 1));
          let itemPrice =
            Math.round((hours / totalProjectHours) * totalBudget * 100) / 100;

          // If billing the remaining deliverables, absorb rounding difference
          const isLastItem = idx === selectedDeliverables.length - 1;
          const remainingUnbilledCount = allDeliverables.filter(
            (item) => !item.billedAt && !input.deliverableIds.includes(item.id),
          ).length;

          if (isLastItem && remainingUnbilledCount === 0) {
            itemPrice = Math.max(
              0,
              Math.round((totalBudget - allocated) * 100) / 100,
            );
          } else {
            allocated += itemPrice;
          }

          return {
            description: `${d.title} (${Number(d.estimatedHours).toFixed(1)}h milestone)`,
            quantity: "1.00",
            unitPrice: formatMoney(Math.max(0, itemPrice)),
            sortOrder: idx + 1,
          };
        });
      } else {
        // Fallback pricing if budget is not set: itemize with 0 or hourly rate
        items = selectedDeliverables.map((d, idx) => ({
          description: `${d.title} (${Number(d.estimatedHours).toFixed(1)}h milestone)`,
          quantity: "1.00",
          unitPrice: "0.00",
          sortOrder: idx + 1,
        }));
      }

      const issueDate = new Date().toISOString().split("T")[0];
      const dueDate = input.dueDate || undefined;
      const currency = project.budgetCurrency || "INR";

      // Create Invoice via InvoiceService
      const invoiceRes = await this.invoiceService.createInvoice(
        {
          clientId: project.clientId,
          projectId: project.id,
          issueDate,
          dueDate,
          currency,
          discountRate: String(input.discountRate ?? "0.00"),
          taxRate: String(input.taxRate ?? "18.00"),
          notes:
            input.notes?.trim() ||
            `Progress billing for completed milestone deliverables: ${selectedDeliverables.map((d) => d.title).join(", ")}`,
          items,
        },
        workspaceId,
        actorId,
      );

      if (!invoiceRes.success) {
        const error = new Error(
          `Failed to create progress invoice: ${invoiceRes.error.message}`,
        ) as Error & { code?: string; statusCode?: number };
        error.code = invoiceRes.error.code || "INVOICE_CREATION_FAILED";
        error.statusCode = 400;
        return err(error);
      }

      const createdInvoice = invoiceRes.data;

      // Concurrency Lock: Claim deliverables atomically
      const claimed = await this.deliverableRepo.atomicClaimBilled(
        input.deliverableIds,
        projectId,
        workspaceId,
        createdInvoice.id,
      );

      // Race condition check: if claimed count != requested count, another concurrent request billed one
      if (claimed.length !== input.deliverableIds.length) {
        // Compensating rollback: delete invoice and unbill any partially claimed items
        await this.invoiceService.deleteInvoice(
          createdInvoice.id,
          workspaceId,
          actorId,
        );
        await this.deliverableRepo.unbillByInvoiceId(
          createdInvoice.id,
          projectId,
          workspaceId,
        );

        const error = new Error(
          "Concurrent billing detected. One or more deliverables were already billed.",
        ) as Error & { code?: string; statusCode?: number };
        error.code = "DELIVERABLE_ALREADY_BILLED";
        error.statusCode = 409;
        return err(error);
      }

      return ok({
        invoice: createdInvoice,
        billedDeliverables: claimed,
      });
    } catch (error: unknown) {
      logger.error("Failed to create progress invoice", {
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Explicit Backfill / Materialization for legacy projects created prior to Sprint 17.
   * STRICT INVARIANT: Must be explicitly called via POST or CLI script, never during GET.
   */
  async backfillProjectDeliverables(
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<
    DeliverableResult<{
      count: number;
      deliverables: ProjectDeliverable[];
      message: string;
    }>
  > {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canUpdateProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectDeliverablePermissionDeniedError(
            "backfill deliverables for",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        const error = new Error(
          "Project not found in this workspace",
        ) as Error & {
          code?: string;
          statusCode?: number;
        };
        error.code = "PROJECT_NOT_FOUND";
        error.statusCode = 404;
        return err(error);
      }

      // Check existing deliverables: if already present, do not duplicate
      const existing = await this.deliverableRepo.listByProject(
        projectId,
        workspaceId,
      );
      if (existing.length > 0) {
        return ok({
          count: existing.length,
          deliverables: existing,
          message:
            "Project already has operational deliverables. Skipped duplicate backfill.",
        });
      }

      if (!this.scopeAnalysisRepo) {
        const error = new Error("Scope repository not available") as Error & {
          code?: string;
          statusCode?: number;
        };
        error.code = "SERVICE_UNAVAILABLE";
        error.statusCode = 503;
        return err(error);
      }

      // Find linked confirmed scope
      const scopes = await this.scopeAnalysisRepo.listByWorkspace(workspaceId, {
        projectId,
      });
      const linkedScope = scopes.find((s) => s.projectId === projectId);

      if (!linkedScope) {
        return ok({
          count: 0,
          deliverables: [],
          message: "No linked confirmed scope found for this project.",
        });
      }

      const scopeResult = (linkedScope.result || {}) as {
        deliverables?: Array<{
          title: string;
          description?: string;
          estimated_hours?: number;
          complexity?: string;
        }>;
      };

      const sourceDeliverables = scopeResult.deliverables || [];
      if (sourceDeliverables.length === 0) {
        return ok({
          count: 0,
          deliverables: [],
          message: "Linked scope contains no deliverable items.",
        });
      }

      // Batch insert deliverables with provenance
      const insertData = sourceDeliverables.map((d, idx) => ({
        workspaceId,
        projectId,
        title: d.title.trim(),
        description: d.description?.trim() || null,
        estimatedHours: Number(d.estimated_hours || 0).toFixed(2),
        loggedHours: "0.00",
        complexity:
          d.complexity?.toLowerCase() === "low" ||
          d.complexity?.toLowerCase() === "high"
            ? (d.complexity.toLowerCase() as "low" | "high")
            : ("medium" as const),
        status: "pending" as const,
        position: idx + 1,
        sourceScopeId: linkedScope.id,
      }));

      const created = await this.deliverableRepo.createMany(insertData);

      logger.info("Explicit deliverables backfill complete", {
        projectId,
        workspaceId,
        count: created.length,
      });

      return ok({
        count: created.length,
        deliverables: created,
        message: `Successfully materialized ${created.length} deliverables from scope.`,
      });
    } catch (error: unknown) {
      logger.error("Failed to backfill project deliverables", {
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
