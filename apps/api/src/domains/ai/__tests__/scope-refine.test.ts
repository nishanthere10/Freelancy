import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMemberRepository } from "../../workspace/repository";
import {
  convertScopeToProject,
  refineScopeAnalysis,
  updateScopeAnalysisResult,
} from "../ai.controller";
import { aiService } from "../ai.service";
import { ScopeAnalysisRepository } from "../repository";

describe("Scope Refinement, Editing & Conversion Tests", () => {
  const workspaceId = "11111111-1111-1111-1111-111111111111";
  const userId = "22222222-2222-2222-2222-222222222222";
  const scopeId = "33333333-3333-3333-3333-333333333333";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockScopeRecord = {
    id: scopeId,
    workspaceId,
    projectId: null,
    actorUserId: userId,
    inputText: "Build an automated billing system",
    result: {
      summary: "Billing system with Stripe checkout",
      deliverables: [
        {
          title: "Stripe Webhooks",
          description: "Process subscription events",
          estimated_hours: 15,
          complexity: "medium",
          skills_required: ["Node.js", "Stripe"],
        },
      ],
      timeline_weeks: 2,
      confidence_score: 92,
    },
    confirmedAt: null,
    createdAt: new Date("2026-09-08T12:00:00Z"),
    updatedAt: new Date("2026-09-08T12:00:00Z"),
  };

  describe("refineScopeAnalysis controller", () => {
    it("returns 401 if user is unauthenticated", async () => {
      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId, scopeId },
        body: { revisionPrompt: "Add unit tests" },
        headers: {},
      } as unknown as Request;

      const res = {
        status(s: number) {
          status = s;
          return this;
        },
        json(b: Record<string, unknown>) {
          body = b;
          return this;
        },
      } as unknown as Response;

      await refineScopeAnalysis(req, res, vi.fn());
      expect(status).toBe(401);
      expect(body.error).toBe("UNAUTHORIZED");
    });

    it("returns 403 if user is not a workspace member", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue(null);

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId, scopeId },
        user: { id: userId },
        body: { revisionPrompt: "Add unit tests" },
        headers: {},
      } as unknown as Request;

      const res = {
        status(s: number) {
          status = s;
          return this;
        },
        json(b: Record<string, unknown>) {
          body = b;
          return this;
        },
      } as unknown as Response;

      await refineScopeAnalysis(req, res, vi.fn());
      expect(status).toBe(403);
      expect(body.error).toBe("FORBIDDEN");
    });

    it("successfully refines scope when authorized", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
        workspaceId,
        userId,
        role: "owner",
        joinedAt: new Date(),
      });

      const refinedScope = {
        ...mockScopeRecord,
        result: {
          ...mockScopeRecord.result,
          summary:
            "Billing system with Stripe checkout - Refined: Add unit tests",
        },
      };

      vi.spyOn(aiService, "refineScope").mockResolvedValue(refinedScope as any);

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId, scopeId },
        user: { id: userId },
        body: { revisionPrompt: "Add unit tests" },
        headers: { "x-request-id": "req_test_refine" },
      } as unknown as Request;

      const res = {
        status(s: number) {
          status = s;
          return this;
        },
        json(b: Record<string, unknown>) {
          body = b;
          return this;
        },
      } as unknown as Response;

      await refineScopeAnalysis(req, res, vi.fn());
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as any).result.summary).toContain(
        "Refined: Add unit tests",
      );
    });
  });

  describe("updateScopeAnalysisResult controller (manual edits)", () => {
    it("updates scope result with manual edits", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
        workspaceId,
        userId,
        role: "owner",
        joinedAt: new Date(),
      });

      const updatedScope = {
        ...mockScopeRecord,
        result: {
          ...mockScopeRecord.result,
          deliverables: [
            {
              title: "Updated Deliverable Title",
              description: "Manually edited description",
              estimated_hours: 25,
              complexity: "high",
              skills_required: ["TypeScript"],
            },
          ],
        },
      };

      vi.spyOn(aiService, "updateScopeResult").mockResolvedValue(
        updatedScope as any,
      );

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId, scopeId },
        user: { id: userId },
        body: updatedScope.result,
        headers: {},
      } as unknown as Request;

      const res = {
        status(s: number) {
          status = s;
          return this;
        },
        json(b: Record<string, unknown>) {
          body = b;
          return this;
        },
      } as unknown as Response;

      await updateScopeAnalysisResult(req, res, vi.fn());
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as any).result.deliverables[0].title).toBe(
        "Updated Deliverable Title",
      );
      expect((body.data as any).result.deliverables[0].estimated_hours).toBe(
        25,
      );
    });
  });

  describe("convertScopeToProject controller", () => {
    it("converts confirmed scope to project and returns 201", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
        workspaceId,
        userId,
        role: "owner",
        joinedAt: new Date(),
      });

      const conversionResult = {
        project: {
          id: "proj_new_123",
          workspaceId,
          name: "SaaS Billing Platform",
          status: "active",
        },
        invoice: {
          id: "inv_new_123",
          workspaceId,
          total: "2500.00",
        },
        scope: {
          ...mockScopeRecord,
          projectId: "proj_new_123",
        },
      };

      vi.spyOn(aiService, "convertScopeToProject").mockResolvedValue(
        conversionResult as any,
      );

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId, scopeId },
        user: { id: userId },
        body: {
          name: "SaaS Billing Platform",
          depositPercentage: 50,
          budget: 5000,
          currency: "USD",
        },
        headers: {},
      } as unknown as Request;

      const res = {
        status(s: number) {
          status = s;
          return this;
        },
        json(b: Record<string, unknown>) {
          body = b;
          return this;
        },
      } as unknown as Response;

      await convertScopeToProject(req, res, vi.fn());
      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect((body.data as any).project.id).toBe("proj_new_123");
      expect((body.data as any).invoice.id).toBe("inv_new_123");
      expect((body.data as any).scope.projectId).toBe("proj_new_123");
    });

    it("rejects conversion with 409 ALREADY_CONVERTED if scope is already linked to a project", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
        workspaceId,
        userId,
        role: "owner",
        joinedAt: new Date(),
      });

      const alreadyConvertedScope = {
        ...mockScopeRecord,
        projectId: "existing-proj-uuid",
        confirmedAt: new Date(),
      };

      vi.spyOn(ScopeAnalysisRepository.prototype, "findById").mockResolvedValue(
        alreadyConvertedScope as any,
      );

      await expect(
        aiService.convertScopeToProject({
          workspaceId,
          actorId: userId,
          scopeId,
          projectData: {
            name: "Duplicate Project",
            depositPercentage: 0,
            depositDueDays: 14,
            status: "active",
            currency: "USD",
          },
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: "ALREADY_CONVERTED",
      });
    });

    it("rejects conversion with 422 UNCONFIRMED_SCOPE if scope has not been confirmed", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
        workspaceId,
        userId,
        role: "owner",
        joinedAt: new Date(),
      });

      const unconfirmedScope = {
        ...mockScopeRecord,
        projectId: null,
        confirmedAt: null,
      };

      vi.spyOn(ScopeAnalysisRepository.prototype, "findById").mockResolvedValue(
        unconfirmedScope as any,
      );

      await expect(
        aiService.convertScopeToProject({
          workspaceId,
          actorId: userId,
          scopeId,
          projectData: {
            name: "Unconfirmed Project",
            depositPercentage: 0,
            depositDueDays: 14,
            status: "active",
            currency: "USD",
          },
        }),
      ).rejects.toMatchObject({
        statusCode: 422,
        code: "UNCONFIRMED_SCOPE",
      });
    });
  });

  describe("refineScopeSchema validation", () => {
    it("rejects revisionPrompt longer than 1000 characters", async () => {
      const { refineScopeSchema } = await import("../ai.schema");
      const hugePrompt = "a".repeat(1001);
      const result = refineScopeSchema.safeParse({
        revisionPrompt: hugePrompt,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "cannot exceed 1000 characters",
        );
      }
    });

    it("accepts valid revisionPrompt within length limits", async () => {
      const { refineScopeSchema } = await import("../ai.schema");
      const validPrompt = "Add automated Playwright testing";
      const result = refineScopeSchema.safeParse({
        revisionPrompt: validPrompt,
      });
      expect(result.success).toBe(true);
    });
  });
});
