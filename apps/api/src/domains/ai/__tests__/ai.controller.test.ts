import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiServiceClient } from "../../../ai/client";
import { WorkspaceMemberRepository } from "../../workspace/repository";
import {
  confirmScopeAnalysis,
  generateScopeAnalysis,
  getScopeAnalysis,
  listScopeAnalyses,
} from "../ai.controller";
import { aiService } from "../ai.service";
import { ScopeAnalysisRepository } from "../repository";

describe("AI Controller & Scope Analysis API", () => {
  const workspaceId = "ws_1111_1111_1111";
  const userId = "usr_2222_2222_2222";
  const scopeId = "scope_3333_3333_3333";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockScopeRecord = {
    id: scopeId,
    workspaceId,
    projectId: null,
    actorUserId: userId,
    inputText: "Build a modern marketplace platform",
    result: {
      summary: "Marketplace platform with payments",
      estimatedHours: 60,
    },
    confirmedAt: null,
    createdAt: new Date("2026-08-30T12:00:00Z"),
    updatedAt: new Date("2026-08-30T12:00:00Z"),
  };

  describe("generateScopeAnalysis", () => {
    it("returns 401 if user is unauthenticated", async () => {
      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId },
        body: { inputText: "Build an e-commerce platform" },
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

      await generateScopeAnalysis(req, res, vi.fn());

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
        body: { inputText: "Build an e-commerce platform" },
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

      await generateScopeAnalysis(req, res, vi.fn());

      expect(status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error).toBe("FORBIDDEN");
    });

    it("generates and persists scope analysis draft, returning 200 OK", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
        workspaceId,
        userId,
        role: "owner",
        joinedAt: new Date(),
        deletedAt: null,
        invitedBy: null,
      });

      vi.spyOn(aiServiceClient, "post").mockResolvedValue({
        summary: "Marketplace platform with payments",
        estimatedHours: 60,
      });

      vi.spyOn(ScopeAnalysisRepository.prototype, "create").mockResolvedValue(
        mockScopeRecord,
      );

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId },
        user: { id: userId },
        id: "req_generate_123",
        body: { inputText: "Build a modern marketplace platform" },
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

      await generateScopeAnalysis(req, res, vi.fn());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockScopeRecord);
      expect(aiServiceClient.post).toHaveBeenCalledWith(
        "/api/v1/scope",
        expect.objectContaining({
          workspaceId,
          actorId: userId,
          actorRole: "owner",
          requestId: "req_generate_123",
        }),
      );
    });
  });

  describe("confirmScopeAnalysis", () => {
    it("confirms scope analysis and sets confirmed timestamp", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
        workspaceId,
        userId,
        role: "editor",
        joinedAt: new Date(),
        deletedAt: null,
        invitedBy: null,
      });

      const confirmedRecord = {
        ...mockScopeRecord,
        confirmedAt: new Date("2026-08-30T13:00:00Z"),
      };

      vi.spyOn(ScopeAnalysisRepository.prototype, "findById").mockResolvedValue(
        mockScopeRecord,
      );
      vi.spyOn(ScopeAnalysisRepository.prototype, "confirm").mockResolvedValue(
        confirmedRecord,
      );

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId, scopeId },
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

      await confirmScopeAnalysis(req, res, vi.fn());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as { confirmedAt: Date }).confirmedAt).toBeDefined();
    });

    it("propagates 404 error when scope is not found in workspace", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
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
        params: { workspaceId, scopeId: "non-existent" },
        user: { id: userId },
        headers: {},
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await confirmScopeAnalysis(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          code: "NOT_FOUND",
        }),
      );
    });
  });

  describe("getScopeAnalysis and listScopeAnalyses", () => {
    it("fetches single scope analysis by id", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
        workspaceId,
        userId,
        role: "viewer",
        joinedAt: new Date(),
        deletedAt: null,
        invitedBy: null,
      });

      vi.spyOn(ScopeAnalysisRepository.prototype, "findById").mockResolvedValue(
        mockScopeRecord,
      );

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId, scopeId },
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

      await getScopeAnalysis(req, res, vi.fn());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockScopeRecord);
    });

    it("lists all scope analyses for workspace", async () => {
      vi.spyOn(
        WorkspaceMemberRepository.prototype,
        "getByWorkspaceAndUser",
      ).mockResolvedValue({
        id: "mem_1",
        workspaceId,
        userId,
        role: "viewer",
        joinedAt: new Date(),
        deletedAt: null,
        invitedBy: null,
      });

      vi.spyOn(
        ScopeAnalysisRepository.prototype,
        "listByWorkspace",
      ).mockResolvedValue([mockScopeRecord]);

      let status = 0;
      let body: Record<string, unknown> = {};

      const req = {
        params: { workspaceId },
        user: { id: userId },
        query: { limit: "10" },
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

      await listScopeAnalyses(req, res, vi.fn());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([mockScopeRecord]);
    });
  });
});
