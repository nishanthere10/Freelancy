import type { DriftAnalysis, ScopeAnalysis } from "@repo/database";
import { aiServiceClient } from "../../ai/client";
import type { AiRequestPayload } from "../../ai/types";
import { DriftAnalysisRepository } from "./drift.repository";
import { ScopeAnalysisRepository } from "./repository";

export class AiService {
  constructor(
    private readonly repository: ScopeAnalysisRepository = new ScopeAnalysisRepository(),
    private readonly client = aiServiceClient,
    private readonly driftRepository: DriftAnalysisRepository = new DriftAnalysisRepository(),
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
