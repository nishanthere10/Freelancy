import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiServiceClient } from "../../../ai/client";
import { WorkspaceMemberRepository } from "../../workspace/repository";
import { analyzeScopeDrift, listScopeDriftAnalyses } from "../ai.controller";
import { DriftAnalysisRepository } from "../drift.repository";
import { ScopeAnalysisRepository } from "../repository";

describe("Drift Controller & Scope Drift Detection API", () => {
  const workspaceId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const userId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const scopeId = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
  const driftId = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockConfirmedScope = {
    id: scopeId,
    workspaceId,
    projectId: null,
    actorUserId: userId,
    inputText: "Build MVP e-commerce store with Stripe",
    result: {
      summary: "E-commerce MVP",
      timeline_weeks: 4,
      deliverables: [
        {
          title: "Stripe checkout",
          estimated_hours: 20,
          complexity: "medium",
        },
      ],
    },
    confirmedAt: new Date("2026-08-31T10:00:00Z"),
    createdAt: new Date("2026-08-30T10:00:00Z"),
    updatedAt: new Date("2026-08-31T10:00:00Z"),
  };

  const mockDriftResult = {
    summary: "Change request introduces moderate scope drift",
    recommendation: "negotiate",
    recommendation_rationale: "Requires crypto payments integration",
    affected_deliverables: [
      {
        title: "Stripe checkout",
        impact_description: "Needs Web3 adapter",
        additional_hours: 8,
      },
    ],
    timeline_delta_days: 5,
    budget_delta_percentage: 15.0,
    new_deliverables_required: ["Wallet provider integration"],
    confidence_score: 88,
  };

  const mockDriftRecord = {
    id: driftId,
    workspaceId,
    scopeAnalysisId: scopeId,
    actorUserId: userId,
    changeRequestText:
      "Can we also accept Bitcoin and Ethereum payments at checkout?",
    result: mockDriftResult,
    createdAt: new Date("2026-09-01T12:00:00Z"),
    updatedAt: new Date("2026-09-01T12:00:00Z"),
  };

  describe("analyzeScopeDrift", () => {
    it("returns 401 if user is unauthenticated", async () => {
      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId },
        body: {
          changeRequestText:
            "Can we also accept Bitcoin and Ethereum payments at checkout?",
          scopeAnalysisId: scopeId,
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

      await analyzeScopeDrift(req, res, vi.fn());

      expect(status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toBe("UNAUTHORIZED");
    });

    it("returns 403 if user is not a member of the workspace", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue(null);

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId },
        user: { id: userId },
        body: {
          changeRequestText:
            "Can we also accept Bitcoin and Ethereum payments at checkout?",
          scopeAnalysisId: scopeId,
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

      await analyzeScopeDrift(req, res, vi.fn());

      expect(status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error).toBe("FORBIDDEN");
    });

    it("returns 403 if user has viewer role", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_viewer",
        workspaceId,
        userId,
        role: "viewer",
        joinedAt: new Date(),
        deletedAt: null,
        invitedBy: null,
      });

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId },
        user: { id: userId },
        body: {
          changeRequestText:
            "Can we also accept Bitcoin and Ethereum payments at checkout?",
          scopeAnalysisId: scopeId,
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

      await analyzeScopeDrift(req, res, vi.fn());

      expect(status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error).toBe("FORBIDDEN");
    });

    it("returns 404 via next if scope analysis does not exist", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_editor",
        workspaceId,
        userId,
        role: "editor",
        joinedAt: new Date(),
        deletedAt: null,
        invitedBy: null,
      });

      vi.spyOn(ScopeAnalysisRepository.prototype, "findById").mockResolvedValue(
        null,
      );

      const nextFn = vi.fn();
      const req = {
        params: { workspaceId },
        user: { id: userId },
        id: "req_drift_123",
        body: {
          changeRequestText:
            "Can we also accept Bitcoin and Ethereum payments at checkout?",
          scopeAnalysisId: scopeId,
        },
        headers: {},
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await analyzeScopeDrift(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          code: "NOT_FOUND",
        }),
      );
    });

    it("returns 422 via next if scope analysis is not confirmed", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_editor",
        workspaceId,
        userId,
        role: "editor",
        joinedAt: new Date(),
        deletedAt: null,
        invitedBy: null,
      });

      vi.spyOn(ScopeAnalysisRepository.prototype, "findById").mockResolvedValue(
        {
          ...mockConfirmedScope,
          confirmedAt: null,
        },
      );

      const nextFn = vi.fn();
      const req = {
        params: { workspaceId },
        user: { id: userId },
        id: "req_drift_123",
        body: {
          changeRequestText:
            "Can we also accept Bitcoin and Ethereum payments at checkout?",
          scopeAnalysisId: scopeId,
        },
        headers: {},
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await analyzeScopeDrift(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 422,
          code: "UNCONFIRMED_SCOPE",
        }),
      );
    });

    it("analyzes drift and persists record, returning 200 OK", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_owner",
        workspaceId,
        userId,
        role: "owner",
        joinedAt: new Date(),
        deletedAt: null,
        invitedBy: null,
      });

      vi.spyOn(ScopeAnalysisRepository.prototype, "findById").mockResolvedValue(
        mockConfirmedScope,
      );

      vi.spyOn(aiServiceClient, "post").mockResolvedValue(mockDriftResult);

      vi.spyOn(DriftAnalysisRepository.prototype, "create").mockResolvedValue(
        mockDriftRecord,
      );

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId },
        user: { id: userId },
        id: "req_drift_success",
        body: {
          changeRequestText:
            "Can we also accept Bitcoin and Ethereum payments at checkout?",
          scopeAnalysisId: scopeId,
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

      await analyzeScopeDrift(req, res, vi.fn());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockDriftRecord);
    });
  });

  describe("listScopeDriftAnalyses", () => {
    it("returns 200 and list of drift records for confirmed scope", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_editor",
        workspaceId,
        userId,
        role: "editor",
        joinedAt: new Date(),
        deletedAt: null,
        invitedBy: null,
      });

      vi.spyOn(
        DriftAnalysisRepository.prototype,
        "listByScope",
      ).mockResolvedValue([mockDriftRecord]);

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId, scopeAnalysisId: scopeId },
        user: { id: userId },
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

      await listScopeDriftAnalyses(req, res, vi.fn());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([mockDriftRecord]);
    });
  });
});
