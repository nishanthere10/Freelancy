import type { DriftAnalysis, Project, ScopeAnalysis } from "@repo/database";
import { aiServiceClient } from "../../ai/client";
import type { AiRequestPayload } from "../../ai/types";
import {
  ActivityEventConsumer,
  InvoiceEventEmitterAdapter,
  ProjectEventEmitterAdapter,
} from "../activity/activity.consumer";
import { ActivityRepository } from "../activity/repository/activity.repository";
import { ClientRepository } from "../client/repository/client.repository";
import { InvoiceService } from "../invoice/invoice.service";
import type { InvoiceWithItems } from "../invoice/invoice.types";
import { InvoiceRepository } from "../invoice/repository/invoice.repository";
import { ProjectService } from "../project/project.service";
import { ProjectDeliverableRepository } from "../project/repository/project-deliverable.repository";
import { ProjectRepository } from "../project/repository/project.repository";
import { WorkspaceMemberRepository } from "../workspace/repository";
import type { ConvertScopeToProjectInput } from "./ai.schema";
import { DriftAnalysisRepository } from "./drift.repository";
import { ScopeAnalysisRepository } from "./repository";

interface DeliverableItem {
  title: string;
  description: string;
  estimated_hours?: number;
  complexity?: string;
  skills_required?: string[];
}

interface ScopeResultData {
  summary?: string;
  deliverables?: DeliverableItem[];
  timeline_weeks?: number;
  confidence_score?: number;
  risks_and_dependencies?: string[];
  recommended_tech_stack?: string[];
}

export class AiService {
  constructor(
    private readonly repository: ScopeAnalysisRepository = new ScopeAnalysisRepository(),
    private readonly client = aiServiceClient,
    private readonly driftRepository: DriftAnalysisRepository = new DriftAnalysisRepository(),
    private readonly projectService: ProjectService = new ProjectService(
      new ProjectRepository(),
      new WorkspaceMemberRepository(),
      new ClientRepository(),
      new ProjectEventEmitterAdapter(
        new ActivityEventConsumer(new ActivityRepository()),
      ),
    ),
    private readonly invoiceService: InvoiceService = new InvoiceService(
      new InvoiceRepository(),
      new WorkspaceMemberRepository(),
      new ClientRepository(),
      new ProjectRepository(),
      new InvoiceEventEmitterAdapter(
        new ActivityEventConsumer(new ActivityRepository()),
      ),
    ),
    private readonly deliverableRepo: ProjectDeliverableRepository = new ProjectDeliverableRepository(),
  ) {}

  /**
   * Generates a structured scope analysis by delegating to the Python AI service
   * and immediately persisting the result as an unconfirmed draft.
   */
  async generateScope(params: {
    workspaceId: string;
    actorId: string;
    actorRole: string;
    inputText: string;
    projectId?: string;
    requestId: string;
  }): Promise<ScopeAnalysis> {
    const payload: AiRequestPayload<{ inputText: string; projectId?: string }> =
      {
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        requestId: params.requestId,
        input: {
          inputText: params.inputText,
          projectId: params.projectId,
        },
      };

    // 1. Call downstream Python AI service
    const aiResult = await this.client.post<
      { inputText: string; projectId?: string },
      Record<string, unknown>
    >("/api/v1/scope", payload);

    // 2. Persist draft scope analysis in database with confirmedAt = null
    const persisted = await this.repository.create({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      actorUserId: params.actorId,
      inputText: params.inputText,
      result: aiResult,
    });

    return persisted;
  }

  /**
   * Confirms an existing scope analysis draft for a workspace.
   */
  async confirmScope(params: {
    workspaceId: string;
    scopeId: string;
  }): Promise<ScopeAnalysis> {
    const existing = await this.repository.findById(
      params.scopeId,
      params.workspaceId,
    );

    if (!existing) {
      const error = new Error(
        "Scope analysis not found in this workspace",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 404;
      error.code = "NOT_FOUND";
      throw error;
    }

    const confirmed = await this.repository.confirm(
      params.scopeId,
      params.workspaceId,
    );

    if (!confirmed) {
      const error = new Error("Failed to confirm scope analysis") as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 500;
      error.code = "INTERNAL_ERROR";
      throw error;
    }

    return confirmed;
  }

  /**
   * Refines an existing scope analysis draft using conversational revision instructions.
   */
  async refineScope(params: {
    workspaceId: string;
    actorId: string;
    actorRole: string;
    scopeId: string;
    revisionPrompt: string;
    requestId: string;
  }): Promise<ScopeAnalysis> {
    const existing = await this.repository.findById(
      params.scopeId,
      params.workspaceId,
    );

    if (!existing) {
      const error = new Error(
        "Scope analysis not found in this workspace",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 404;
      error.code = "NOT_FOUND";
      throw error;
    }

    const aiRefinedResult = await this.client.refineScope(
      params.workspaceId,
      params.actorId,
      params.actorRole,
      params.requestId,
      existing.result,
      params.revisionPrompt,
    );

    const updated = await this.repository.updateResult(
      params.scopeId,
      params.workspaceId,
      aiRefinedResult,
    );

    if (!updated) {
      const error = new Error(
        "Failed to update scope analysis with refinement",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 500;
      error.code = "INTERNAL_ERROR";
      throw error;
    }

    return updated;
  }

  /**
   * Updates a scope analysis with manual deliverable and milestone adjustments.
   */
  async updateScopeResult(params: {
    workspaceId: string;
    scopeId: string;
    result: unknown;
  }): Promise<ScopeAnalysis> {
    const existing = await this.repository.findById(
      params.scopeId,
      params.workspaceId,
    );

    if (!existing) {
      const error = new Error(
        "Scope analysis not found in this workspace",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 404;
      error.code = "NOT_FOUND";
      throw error;
    }

    const updated = await this.repository.updateResult(
      params.scopeId,
      params.workspaceId,
      params.result,
    );

    if (!updated) {
      const error = new Error("Failed to update scope analysis") as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 500;
      error.code = "INTERNAL_ERROR";
      throw error;
    }

    return updated;
  }

  /**
   * Converts a scope analysis into a live Project and optional draft deposit Invoice.
   */
  async convertScopeToProject(params: {
    workspaceId: string;
    actorId: string;
    scopeId: string;
    projectData: ConvertScopeToProjectInput;
  }): Promise<{
    project: Project;
    invoice: InvoiceWithItems | null;
    scope: ScopeAnalysis;
  }> {
    const existing = await this.repository.findById(
      params.scopeId,
      params.workspaceId,
    );

    if (!existing) {
      const error = new Error(
        "Scope analysis not found in this workspace",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 404;
      error.code = "NOT_FOUND";
      throw error;
    }

    if (existing.projectId) {
      const error = new Error(
        "Scope analysis has already been converted to a project",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 409;
      error.code = "ALREADY_CONVERTED";
      throw error;
    }

    if (!existing.confirmedAt) {
      const error = new Error(
        "Scope analysis must be confirmed before conversion to a project",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 422;
      error.code = "UNCONFIRMED_SCOPE";
      throw error;
    }

    const scopeResult = (existing.result || {}) as ScopeResultData;

    // 1. Create Project via ProjectService
    const projectResult = await this.projectService.createProject(
      {
        name: params.projectData.name,
        description:
          params.projectData.description || scopeResult.summary || null,
        clientId: params.projectData.clientId || null,
        pricingModel: "fixed",
        budgetCurrency: params.projectData.currency || "USD",
        budgetAmount: params.projectData.budget ?? null,
        startDate:
          params.projectData.startDate ||
          new Date().toISOString().split("T")[0],
        targetDate: params.projectData.targetDate || null,
      },
      params.workspaceId,
      params.actorId,
    );

    if (!projectResult.success) {
      const error = new Error(projectResult.error.message) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 400;
      error.code = projectResult.error.code;
      throw error;
    }

    const project = projectResult.data;

    // 2. Concurrency Guard: Atomically link scope to project
    // Ensures only one concurrent request can claim this confirmed scope
    const updatedScope = await this.repository.linkProjectAtomic(
      params.scopeId,
      params.workspaceId,
      project.id,
    );

    if (!updatedScope) {
      // Another concurrent request claimed this scope in the race window!
      // Compensating rollback: delete created project
      await this.projectService.deleteProject(
        project.id,
        params.workspaceId,
        params.actorId,
      );
      const error = new Error(
        "Scope analysis has already been converted to a project",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 409;
      error.code = "ALREADY_CONVERTED";
      throw error;
    }

    // 3. Materialize operational deliverables into project_deliverables
    const deliverables = scopeResult.deliverables || [];
    if (deliverables.length > 0) {
      try {
        const deliverableRows = deliverables.map((d, idx) => ({
          workspaceId: params.workspaceId,
          projectId: project.id,
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
          sourceScopeId: existing.id,
        }));

        await this.deliverableRepo.createMany(deliverableRows);
      } catch (delivErr) {
        // Case A Compensating Rollback: delete deliverables, project, and unlink scope
        await this.deliverableRepo.deleteByProject(
          project.id,
          params.workspaceId,
        );
        await this.projectService.deleteProject(
          project.id,
          params.workspaceId,
          params.actorId,
        );
        await this.repository.unlinkProject(params.scopeId, params.workspaceId);

        const error = new Error(
          `Failed to materialize operational deliverables: ${delivErr instanceof Error ? delivErr.message : String(delivErr)}`,
        ) as Error & { statusCode?: number; code?: string };
        error.statusCode = 500;
        error.code = "DELIVERABLE_MATERIALIZATION_FAILED";
        throw error;
      }
    }

    // 4. Optional Deposit Invoice Generation
    let createdInvoice: InvoiceWithItems | null = null;
    const currency = (params.projectData.currency || "USD").toUpperCase();

    if (
      params.projectData.clientId &&
      params.projectData.depositPercentage > 0 &&
      this.invoiceService
    ) {
      const depositPct = params.projectData.depositPercentage;
      const totalBudget = params.projectData.budget ?? 0;
      const depositAmount = (totalBudget * depositPct) / 100;

      let items: Array<{
        description: string;
        quantity: string;
        unitPrice: string;
        sortOrder?: number;
      }> = [];

      if (depositPct === 100 && deliverables.length > 0 && totalBudget > 0) {
        const totalHours = deliverables.reduce(
          (acc: number, d: DeliverableItem) => acc + (d.estimated_hours || 1),
          0,
        );
        let allocated = 0;
        items = deliverables.map((d: DeliverableItem, idx: number) => {
          const itemHours = d.estimated_hours || 1;
          let priceNum =
            Math.round((itemHours / totalHours) * totalBudget * 100) / 100;
          if (idx === deliverables.length - 1) {
            priceNum = Math.round((totalBudget - allocated) * 100) / 100;
          } else {
            allocated += priceNum;
          }
          return {
            description: `${d.title} (${itemHours}h)`,
            quantity: "1.00",
            unitPrice: Math.max(0, priceNum).toFixed(2),
            sortOrder: idx + 1,
          };
        });
      } else {
        items = [
          {
            description: `Initial Deposit (${depositPct}%) for Project: ${project.name}`,
            quantity: "1.00",
            unitPrice: depositAmount > 0 ? depositAmount.toFixed(2) : "0.00",
            sortOrder: 1,
          },
        ];
      }

      const issueDate = new Date().toISOString().split("T")[0];
      const dueDays = params.projectData.depositDueDays || 14;
      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + dueDays);
      const dueDate = dueDateObj.toISOString().split("T")[0];

      try {
        const invoiceRes = await this.invoiceService.createInvoice(
          {
            clientId: params.projectData.clientId,
            projectId: project.id,
            issueDate,
            dueDate,
            currency,
            discountRate: "0.00",
            taxRate: "0.00",
            items,
          },
          params.workspaceId,
          params.actorId,
        );

        if (invoiceRes.success) {
          createdInvoice = invoiceRes.data;
        } else {
          throw new Error(invoiceRes.error.message);
        }
      } catch (invErr) {
        // Case B Compensating Rollback: delete deliverables, project, and unlink scope
        await this.deliverableRepo.deleteByProject(
          project.id,
          params.workspaceId,
        );
        await this.projectService.deleteProject(
          project.id,
          params.workspaceId,
          params.actorId,
        );
        await this.repository.unlinkProject(params.scopeId, params.workspaceId);

        const error = new Error(
          `Failed to create deposit invoice: ${invErr instanceof Error ? invErr.message : String(invErr)}`,
        ) as Error & {
          statusCode?: number;
          code?: string;
        };
        error.statusCode = 400;
        error.code = "INVOICE_CREATION_FAILED";
        throw error;
      }
    }

    return {
      project,
      invoice: createdInvoice,
      scope: (updatedScope || existing) as ScopeAnalysis,
    };
  }

  /**
   * Retrieves a single scope analysis by ID within a workspace.
   */
  async getScope(params: {
    workspaceId: string;
    scopeId: string;
  }): Promise<ScopeAnalysis> {
    const existing = await this.repository.findById(
      params.scopeId,
      params.workspaceId,
    );

    if (!existing) {
      const error = new Error(
        "Scope analysis not found in this workspace",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 404;
      error.code = "NOT_FOUND";
      throw error;
    }

    return existing;
  }

  /**
   * Lists all scope analyses for a workspace.
   */
  async listScopes(params: {
    workspaceId: string;
    projectId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScopeAnalysis[]> {
    return this.repository.listByWorkspace(params.workspaceId, {
      projectId: params.projectId,
      limit: params.limit,
      offset: params.offset,
    });
  }

  /**
   * Analyzes scope drift from a client change request compared against a confirmed scope.
   * Requires that the target scope analysis has already been confirmed.
   */
  async analyzeDrift(params: {
    workspaceId: string;
    actorId: string;
    actorRole: string;
    requestId: string;
    changeRequestText: string;
    scopeAnalysisId: string;
  }): Promise<DriftAnalysis> {
    const scope = await this.repository.findById(
      params.scopeAnalysisId,
      params.workspaceId,
    );

    if (!scope) {
      const error = new Error(
        "Scope analysis not found in this workspace",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 404;
      error.code = "NOT_FOUND";
      throw error;
    }

    if (!scope.confirmedAt) {
      const error = new Error(
        "Scope analysis must be confirmed before drift analysis can be performed",
      ) as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 422;
      error.code = "UNCONFIRMED_SCOPE";
      throw error;
    }

    const payload: AiRequestPayload<{
      changeRequestText: string;
      originalScopeJson: Record<string, unknown>;
      scopeAnalysisId: string;
    }> = {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      requestId: params.requestId,
      input: {
        changeRequestText: params.changeRequestText,
        originalScopeJson: scope.result as Record<string, unknown>,
        scopeAnalysisId: params.scopeAnalysisId,
      },
    };

    const driftResult = await this.client.post<
      {
        changeRequestText: string;
        originalScopeJson: Record<string, unknown>;
        scopeAnalysisId: string;
      },
      Record<string, unknown>
    >("/api/v1/drift/analyze", payload);

    const persisted = await this.driftRepository.create({
      workspaceId: params.workspaceId,
      scopeAnalysisId: params.scopeAnalysisId,
      actorUserId: params.actorId,
      changeRequestText: params.changeRequestText,
      result: driftResult,
    });

    return persisted;
  }

  /**
   * Lists drift analyses for a specific confirmed scope analysis.
   */
  async listDriftsByScope(params: {
    workspaceId: string;
    scopeAnalysisId: string;
  }): Promise<DriftAnalysis[]> {
    return this.driftRepository.listByScope(
      params.scopeAnalysisId,
      params.workspaceId,
    );
  }
}

export const aiService = new AiService();
