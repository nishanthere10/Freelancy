import type { ChangeOrder } from "@repo/database";
import { logger } from "../../utils/logger";
import type { ScopeAnalysisRepository } from "../ai/repository";
import type { InvoiceService } from "../invoice/invoice.service";
import type { WorkspaceMemberRepository } from "../workspace/repository";
import {
  ChangeOrderConflictError,
  ChangeOrderNotFoundError,
  ChangeOrderPermissionDeniedError,
  ChangeOrderValidationError,
  InvalidProjectStateError,
} from "./change-order.errors";
import type {
  ApproveChangeOrderInput,
  ChangeOrderResponseDTO,
  CreateChangeOrderInput,
  UpdateChangeOrderDraftInput,
} from "./change-order.types";
import type { IProjectEventEmitter } from "./project.events";
import { canUpdateProject, canViewProject } from "./project.policies";
import type { ChangeOrderRepository } from "./repository/change-order.repository";
import type { ProjectDeliverableRepository } from "./repository/project-deliverable.repository";
import type { ProjectRepository } from "./repository/project.repository";

export type ChangeOrderResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error & { code?: string; statusCode?: number } };

function ok<T>(data: T): ChangeOrderResult<T> {
  return { success: true, data };
}

function err<T>(
  error: Error & { code?: string; statusCode?: number },
): ChangeOrderResult<T> {
  return { success: false, error };
}

export class ChangeOrderService {
  constructor(
    private readonly changeOrderRepo: ChangeOrderRepository,
    private readonly deliverableRepo: ProjectDeliverableRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly memberRepo: WorkspaceMemberRepository,
    private readonly invoiceService: InvoiceService | null,
    private readonly scopeAnalysisRepo: ScopeAnalysisRepository | null,
    private readonly eventEmitter?: IProjectEventEmitter | null,
  ) {}

  /**
   * Creates a draft change order proposal from scope drift or direct specification.
   */
  async createDraft(
    projectId: string,
    workspaceId: string,
    actorId: string,
    input: CreateChangeOrderInput,
  ): Promise<ChangeOrderResult<ChangeOrder>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      if (!membership || membership.deletedAt) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "create",
            actorId,
            workspaceId,
            "Not a workspace member",
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        return err(
          new ChangeOrderValidationError(
            `Project with ID '${projectId}' was not found in this workspace`,
          ),
        );
      }

      const updatePolicy = canUpdateProject(membership);
      if (!updatePolicy.allowed) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "create",
            actorId,
            workspaceId,
            updatePolicy.reason,
          ),
        );
      }

      if (project.status !== "active") {
        return err(
          new InvalidProjectStateError(
            `Change orders can only be created for active projects. Current status: '${project.status}'`,
          ),
        );
      }

      if (this.scopeAnalysisRepo) {
        const scope = await this.scopeAnalysisRepo.findById(
          input.scopeAnalysisId,
          workspaceId,
        );
        if (!scope) {
          return err(
            new ChangeOrderValidationError(
              `Referenced scope analysis '${input.scopeAnalysisId}' was not found in this workspace`,
            ),
          );
        }
      }

      const changeOrderNumber =
        await this.changeOrderRepo.getNextChangeOrderNumber(
          projectId,
          workspaceId,
        );

      const additionalBudgetStr = (
        Math.round(Number(input.additionalBudget || 0) * 100) / 100
      ).toFixed(2);
      const additionalHoursStr = (
        Math.round(Number(input.additionalHours || 0) * 100) / 100
      ).toFixed(2);

      const changeOrder = await this.changeOrderRepo.create({
        workspaceId,
        projectId,
        scopeAnalysisId: input.scopeAnalysisId,
        driftAnalysisId: input.driftAnalysisId || null,
        changeOrderNumber,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: "draft",
        additionalBudget: additionalBudgetStr,
        additionalHours: additionalHoursStr,
        timelineDeltaDays: input.timelineDeltaDays || 0,
        proposedDeliverables: input.proposedDeliverables,
      });

      if (this.eventEmitter) {
        await this.eventEmitter.emit({
          type: "project.change_order.created",
          projectId,
          workspaceId,
          actorId,
          occurredAt: new Date().toISOString(),
          changeOrderId: changeOrder.id,
          changeOrderNumber: changeOrder.changeOrderNumber,
          title: changeOrder.title,
          additionalBudget: changeOrder.additionalBudget,
        });
      }

      return ok(changeOrder);
    } catch (error: unknown) {
      logger.error("Failed to create change order draft", {
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Updates an existing draft change order proposal.
   */
  async updateDraft(
    changeOrderId: string,
    projectId: string,
    workspaceId: string,
    actorId: string,
    input: UpdateChangeOrderDraftInput,
  ): Promise<ChangeOrderResult<ChangeOrder>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      if (!membership || membership.deletedAt) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "update",
            actorId,
            workspaceId,
            "Not a workspace member",
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        return err(new ChangeOrderNotFoundError(changeOrderId));
      }

      const updatePolicy = canUpdateProject(membership);
      if (!updatePolicy.allowed) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "update",
            actorId,
            workspaceId,
            updatePolicy.reason,
          ),
        );
      }

      const existing = await this.changeOrderRepo.getById(
        changeOrderId,
        projectId,
        workspaceId,
      );
      if (!existing) {
        return err(new ChangeOrderNotFoundError(changeOrderId));
      }

      if (existing.status !== "draft") {
        return err(
          new ChangeOrderConflictError(
            `Cannot update change order because its status is '${existing.status}'`,
          ),
        );
      }

      const updateData: Partial<typeof existing> = {};
      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.description !== undefined)
        updateData.description = input.description?.trim() || null;
      if (input.additionalBudget !== undefined) {
        updateData.additionalBudget = (
          Math.round(Number(input.additionalBudget) * 100) / 100
        ).toFixed(2);
      }
      if (input.additionalHours !== undefined) {
        updateData.additionalHours = (
          Math.round(Number(input.additionalHours) * 100) / 100
        ).toFixed(2);
      }
      if (input.timelineDeltaDays !== undefined) {
        updateData.timelineDeltaDays = input.timelineDeltaDays;
      }
      if (input.proposedDeliverables !== undefined) {
        updateData.proposedDeliverables = input.proposedDeliverables;
      }

      const updated = await this.changeOrderRepo.updateDraft(
        changeOrderId,
        projectId,
        workspaceId,
        updateData,
      );

      if (!updated) {
        return err(
          new ChangeOrderConflictError(
            "Change order was modified or approved concurrently",
          ),
        );
      }

      return ok(updated);
    } catch (error: unknown) {
      logger.error("Failed to update change order draft", {
        changeOrderId,
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Approves a Change Order using a Stateless Compensating Saga:
   * 1. CAS: Claims change order status -> 'approved'.
   * 2. Materializes deliverables with continuous positions (MAX(pos) + 1).
   * 3. Mutates project budget and target completion date.
   * 4. Creates a dedicated change-order invoice.
   * 5. If invoice creation fails, executes compensating rollback:
   *    - Deletes created deliverables
   *    - Reverts project budget and timeline
   *    - Reverts change order status to 'draft'
   */
  async approveChangeOrder(
    changeOrderId: string,
    projectId: string,
    workspaceId: string,
    actorId: string,
    input: ApproveChangeOrderInput = {},
  ): Promise<ChangeOrderResult<ChangeOrderResponseDTO>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      if (!membership || membership.deletedAt) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "approve",
            actorId,
            workspaceId,
            "Not a workspace member",
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        return err(new ChangeOrderNotFoundError(changeOrderId));
      }

      const updatePolicy = canUpdateProject(membership);
      if (!updatePolicy.allowed) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "approve",
            actorId,
            workspaceId,
            updatePolicy.reason,
          ),
        );
      }

      if (project.status !== "active") {
        return err(
          new InvalidProjectStateError(
            `Cannot approve change order for project with status '${project.status}'. Only active projects can accept change orders.`,
          ),
        );
      }

      if (!project.clientId) {
        return err(
          new InvalidProjectStateError(
            "Cannot approve change order: Project has no assigned client. A client is required to issue the change-order invoice.",
          ),
        );
      }

      // 1. CAS Atomic Claim: draft -> approved
      const claimedChangeOrder = await this.changeOrderRepo.atomicClaimApproved(
        changeOrderId,
        projectId,
        workspaceId,
        actorId,
      );

      if (!claimedChangeOrder) {
        const current = await this.changeOrderRepo.getById(
          changeOrderId,
          projectId,
          workspaceId,
        );
        if (!current) {
          return err(new ChangeOrderNotFoundError(changeOrderId));
        }
        if (current.status === "approved") {
          const conflictError = new ChangeOrderConflictError(
            "Change order has already been approved",
          ) as Error & { code?: string; statusCode?: number };
          conflictError.statusCode = 409;
          return err(conflictError);
        }
        const conflictError = new ChangeOrderConflictError(
          `Cannot approve change order in '${current.status}' status`,
        ) as Error & { code?: string; statusCode?: number };
        conflictError.statusCode = 409;
        return err(conflictError);
      }

      // 2. Query continuous position and batch-materialize new deliverables
      const maxPosition = await this.deliverableRepo.getMaxPosition(
        projectId,
        workspaceId,
      );

      const proposed = claimedChangeOrder.proposedDeliverables || [];
      const deliverablesToInsert = proposed.map((item, idx) => ({
        workspaceId,
        projectId,
        title: item.title,
        description: item.description || null,
        estimatedHours: String(item.estimatedHours || "0.00"),
        complexity: item.complexity || "medium",
        status: "pending" as const,
        position: maxPosition + idx + 1,
        sourceScopeId: claimedChangeOrder.scopeAnalysisId,
        changeOrderId: claimedChangeOrder.id,
      }));

      if (deliverablesToInsert.length > 0) {
        await this.deliverableRepo.createMany(deliverablesToInsert);
      }

      // 3. Increment project budget & adjust timeline
      const currentBudget = Number(project.budgetAmount || 0);
      const additionalBudgetNum = Number(
        claimedChangeOrder.additionalBudget || 0,
      );
      const newBudget = currentBudget + additionalBudgetNum;

      let newTargetDate: string | null = project.targetDate;
      if (
        claimedChangeOrder.timelineDeltaDays &&
        claimedChangeOrder.timelineDeltaDays > 0
      ) {
        const baseDate = project.targetDate
          ? new Date(project.targetDate)
          : new Date();
        newTargetDate = new Date(
          baseDate.getTime() +
            claimedChangeOrder.timelineDeltaDays * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split("T")[0];
      }

      const updatedProject = await this.projectRepo.update(
        projectId,
        workspaceId,
        {
          budgetAmount: newBudget,
          targetDate: newTargetDate,
          updatedBy: actorId,
        },
      );

      // 4. Create dedicated Change-Order Invoice (Compensating Saga step)
      let createdInvoice: {
        id: string;
        invoiceNumber: string;
        totalAmount: string;
        status: string;
      } | null = null;

      if (this.invoiceService && additionalBudgetNum > 0) {
        try {
          let invoiceItems: Array<{
            description: string;
            quantity: string;
            unitPrice: string;
            sortOrder: number;
          }>;

          if (proposed.length > 0) {
            const count = proposed.length;
            const baseAmount =
              Math.floor((additionalBudgetNum / count) * 100) / 100;
            let runningSum = 0;

            invoiceItems = proposed.map((d, i) => {
              const isLast = i === count - 1;
              const price = isLast
                ? Number((additionalBudgetNum - runningSum).toFixed(2))
                : baseAmount;
              runningSum += price;

              return {
                description: `Change Order ${claimedChangeOrder.changeOrderNumber}: ${d.title}`,
                quantity: "1.00",
                unitPrice: price.toFixed(2),
                sortOrder: i + 1,
              };
            });
          } else {
            invoiceItems = [
              {
                description: `Change Order ${claimedChangeOrder.changeOrderNumber}: ${claimedChangeOrder.title}`,
                quantity: "1.00",
                unitPrice: additionalBudgetNum.toFixed(2),
                sortOrder: 1,
              },
            ];
          }

          const invoiceRes = await this.invoiceService.createInvoice(
            {
              clientId: project.clientId,
              projectId,
              dueDate: input.dueDate || null,
              notes:
                input.notes ||
                `Change Order Invoice for ${claimedChangeOrder.changeOrderNumber}: ${claimedChangeOrder.title}`,
              items: invoiceItems,
              currency: project.budgetCurrency || "INR",
              discountRate: "0.00",
              taxRate: "18.00",
            },
            workspaceId,
            actorId,
          );

          if (!invoiceRes.success) {
            throw new Error(
              invoiceRes.error.message ||
                "Invoice creation failed during change order approval",
            );
          }

          const invData = invoiceRes.data;
          createdInvoice = {
            id: invData.id,
            invoiceNumber: invData.invoiceNumber || "",
            totalAmount: invData.totalAmount || "0.00",
            status: invData.status,
          };

          await this.changeOrderRepo.linkInvoice(
            claimedChangeOrder.id,
            projectId,
            workspaceId,
            invData.id,
          );
        } catch (invoiceError: unknown) {
          // --- COMPENSATING SAGA ROLLBACK ---
          logger.error(
            "Invoice creation failed during Change Order approval. Executing compensating rollback.",
            {
              changeOrderId,
              projectId,
              error: invoiceError,
            },
          );

          // a. Delete inserted deliverables
          await this.deliverableRepo.deleteByChangeOrderId(
            claimedChangeOrder.id,
            projectId,
            workspaceId,
          );

          // b. Revert project budget & target date
          await this.projectRepo.update(projectId, workspaceId, {
            budgetAmount: project.budgetAmount
              ? Number(project.budgetAmount)
              : null,
            targetDate: project.targetDate,
            updatedBy: actorId,
          });

          // c. Revert change order status back to 'draft'
          await this.changeOrderRepo.revertStatus(
            claimedChangeOrder.id,
            projectId,
            workspaceId,
            "draft",
          );

          const error = new Error(
            `Change order approval aborted and rolled back: ${
              invoiceError instanceof Error
                ? invoiceError.message
                : String(invoiceError)
            }`,
          ) as Error & { code?: string; statusCode?: number };
          error.code = "INVOICE_CREATION_FAILED";
          error.statusCode = 422;
          return err(error);
        }
      }

      // 5. Emit domain activity event
      if (this.eventEmitter) {
        await this.eventEmitter.emit({
          type: "project.change_order.approved",
          projectId,
          workspaceId,
          actorId,
          occurredAt: new Date().toISOString(),
          changeOrderId: claimedChangeOrder.id,
          changeOrderNumber: claimedChangeOrder.changeOrderNumber,
          title: claimedChangeOrder.title,
          additionalBudget: claimedChangeOrder.additionalBudget,
          invoiceId: createdInvoice?.id || null,
        });
      }

      const refreshedChangeOrder =
        (await this.changeOrderRepo.getById(
          changeOrderId,
          projectId,
          workspaceId,
        )) || claimedChangeOrder;

      return ok({
        changeOrder: refreshedChangeOrder,
        projectUpdated: {
          budgetAmount: updatedProject.budgetAmount,
          targetDate: updatedProject.targetDate,
        },
        invoiceCreated: createdInvoice || undefined,
      });
    } catch (error: unknown) {
      logger.error("Failed to approve change order", {
        changeOrderId,
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Rejects a change order proposal. Operational state remains untouched.
   */
  async rejectChangeOrder(
    changeOrderId: string,
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<ChangeOrderResult<ChangeOrder>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      if (!membership || membership.deletedAt) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "reject",
            actorId,
            workspaceId,
            "Not a workspace member",
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        return err(new ChangeOrderNotFoundError(changeOrderId));
      }

      const updatePolicy = canUpdateProject(membership);
      if (!updatePolicy.allowed) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "reject",
            actorId,
            workspaceId,
            updatePolicy.reason,
          ),
        );
      }

      const existing = await this.changeOrderRepo.getById(
        changeOrderId,
        projectId,
        workspaceId,
      );
      if (!existing) {
        return err(new ChangeOrderNotFoundError(changeOrderId));
      }

      if (existing.status !== "draft") {
        return err(
          new ChangeOrderConflictError(
            `Cannot reject change order with status '${existing.status}'`,
          ),
        );
      }

      const updated = await this.changeOrderRepo.updateStatus(
        changeOrderId,
        projectId,
        workspaceId,
        "rejected",
      );

      if (!updated) {
        return err(
          new ChangeOrderConflictError(
            "Change order status was modified concurrently",
          ),
        );
      }

      if (this.eventEmitter) {
        await this.eventEmitter.emit({
          type: "project.change_order.rejected",
          projectId,
          workspaceId,
          actorId,
          occurredAt: new Date().toISOString(),
          changeOrderId: updated.id,
          changeOrderNumber: updated.changeOrderNumber,
          title: updated.title,
        });
      }

      return ok(updated);
    } catch (error: unknown) {
      logger.error("Failed to reject change order", {
        changeOrderId,
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Cancels a draft change order proposal.
   */
  async cancelChangeOrder(
    changeOrderId: string,
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<ChangeOrderResult<ChangeOrder>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      if (!membership || membership.deletedAt) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "cancel",
            actorId,
            workspaceId,
            "Not a workspace member",
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        return err(new ChangeOrderNotFoundError(changeOrderId));
      }

      const updatePolicy = canUpdateProject(membership);
      if (!updatePolicy.allowed) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "cancel",
            actorId,
            workspaceId,
            updatePolicy.reason,
          ),
        );
      }

      const existing = await this.changeOrderRepo.getById(
        changeOrderId,
        projectId,
        workspaceId,
      );
      if (!existing) {
        return err(new ChangeOrderNotFoundError(changeOrderId));
      }

      if (existing.status !== "draft") {
        return err(
          new ChangeOrderConflictError(
            `Cannot cancel change order with status '${existing.status}'`,
          ),
        );
      }

      const updated = await this.changeOrderRepo.updateStatus(
        changeOrderId,
        projectId,
        workspaceId,
        "cancelled",
      );

      if (!updated) {
        return err(
          new ChangeOrderConflictError(
            "Change order status was modified concurrently",
          ),
        );
      }

      if (this.eventEmitter) {
        await this.eventEmitter.emit({
          type: "project.change_order.cancelled",
          projectId,
          workspaceId,
          actorId,
          occurredAt: new Date().toISOString(),
          changeOrderId: updated.id,
          changeOrderNumber: updated.changeOrderNumber,
          title: updated.title,
        });
      }

      return ok(updated);
    } catch (error: unknown) {
      logger.error("Failed to cancel change order", {
        changeOrderId,
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Retrieves a change order by ID.
   */
  async getById(
    changeOrderId: string,
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<ChangeOrderResult<ChangeOrder>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      if (!membership || membership.deletedAt) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "view",
            actorId,
            workspaceId,
            "Not a workspace member",
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        return err(new ChangeOrderNotFoundError(changeOrderId));
      }

      const viewPolicy = canViewProject(membership);
      if (!viewPolicy.allowed) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "view",
            actorId,
            workspaceId,
            viewPolicy.reason,
          ),
        );
      }

      const changeOrder = await this.changeOrderRepo.getById(
        changeOrderId,
        projectId,
        workspaceId,
      );
      if (!changeOrder) {
        return err(new ChangeOrderNotFoundError(changeOrderId));
      }

      return ok(changeOrder);
    } catch (error: unknown) {
      logger.error("Failed to get change order", {
        changeOrderId,
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Lists all change orders for a project.
   */
  async listByProject(
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<ChangeOrderResult<ChangeOrder[]>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      if (!membership || membership.deletedAt) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "list",
            actorId,
            workspaceId,
            "Not a workspace member",
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        return err(
          new ChangeOrderValidationError(
            `Project with ID '${projectId}' was not found`,
          ),
        );
      }

      const viewPolicy = canViewProject(membership);
      if (!viewPolicy.allowed) {
        return err(
          new ChangeOrderPermissionDeniedError(
            "list",
            actorId,
            workspaceId,
            viewPolicy.reason,
          ),
        );
      }

      const list = await this.changeOrderRepo.listByProject(
        projectId,
        workspaceId,
      );
      return ok(list);
    } catch (error: unknown) {
      logger.error("Failed to list change orders", {
        projectId,
        workspaceId,
        error,
      });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
