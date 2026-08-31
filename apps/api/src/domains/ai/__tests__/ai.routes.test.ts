import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiServiceClient } from "../../../ai/client";
import { AiServiceError, AiTimeoutError } from "../../../ai/errors";
import { WorkspaceMemberRepository } from "../../workspace/repository";
import aiRoutes from "../ai.routes";

describe("AI Domain HTTP Routes (Bridge)", () => {
  let app: Application;
  let mockUser: { id: string } | undefined;

  beforeEach(() => {
    mockUser = { id: "usr_1111" };

    app = express();
    app.use(express.json());

    // Middleware to simulate Clerk / userResolver
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as unknown as { user?: { id: string }; id?: string }).user =
        mockUser;
      (req as unknown as { id?: string }).id = "req_ai_route_test";
      next();
    });

    app.use("/api/v1/workspaces/:workspaceId/ai", aiRoutes);

    // Standard error handling middleware
    app.use(
      (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        const errorObj = err as {
          statusCode?: number;
          status?: number;
          code?: string;
          message?: string;
          details?: unknown;
          requestId?: string;
        };
        const status = errorObj?.statusCode || errorObj?.status || 500;
        res.status(status).json({
          success: false,
          error: errorObj?.code || "INTERNAL_ERROR",
          message:
            err instanceof Error ? err.message : "An unexpected error occurred",
          details: errorObj?.details,
          requestId: errorObj?.requestId || "req_ai_route_test",
        });
      },
    );
  });

  it("returns 401 if user is unauthenticated", async () => {
    mockUser = undefined;

    const res = await (async () => {
      const response = await fetch("http://localhost/test", {
        // will mock direct call via supertest-like mock or direct invocation
      }).catch(() => null);
      return response;
    })();

    // Direct invocation via request simulation
    let status = 0;
    let body: Record<string, unknown> = {};

    const req = {
      params: { workspaceId: "ws_999" },
      body: { prompt: "Test" },
      headers: {},
    } as unknown as Request;

    const mockRes = {
      status(s: number) {
        status = s;
        return this;
      },
      json(b: Record<string, unknown>) {
        body = b;
        return this;
      },
    } as unknown as Response;

    const { testAiBridge } = await import("../ai.controller");
    await testAiBridge(req, mockRes, vi.fn());

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
      params: { workspaceId: "ws_forbidden" },
      user: { id: "usr_intruder" },
      body: { prompt: "Test" },
      headers: {},
    } as unknown as Request;

    const mockRes = {
      status(s: number) {
        status = s;
        return this;
      },
      json(b: Record<string, unknown>) {
        body = b;
        return this;
      },
    } as unknown as Response;

    const { testAiBridge } = await import("../ai.controller");
    await testAiBridge(req, mockRes, vi.fn());

    expect(status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe("FORBIDDEN");
  });

  it("forwards verified payload to AI service and returns 200 on success", async () => {
    vi.spyOn(
      WorkspaceMemberRepository.prototype,
      "getByWorkspaceAndUser",
    ).mockResolvedValue({
      id: "mem_1",
      workspaceId: "ws_valid",
      userId: "usr_1111",
      role: "editor",
      joinedAt: new Date(),
      deletedAt: null,
      invitedBy: null,
    });

    const aiSpy = vi.spyOn(aiServiceClient, "post").mockResolvedValue({
      status: "received",
      workspaceId: "ws_valid",
      actorId: "usr_1111",
      actorRole: "editor",
      echoInput: { prompt: "Analyze" },
    });

    let status = 0;
    let body: Record<string, unknown> = {};

    const req = {
      params: { workspaceId: "ws_valid" },
      user: { id: "usr_1111" },
      id: "req_verified_123",
      body: { prompt: "Analyze" },
      headers: {},
    } as unknown as Request;

    const mockRes = {
      status(s: number) {
        status = s;
        return this;
      },
      json(b: Record<string, unknown>) {
        body = b;
        return this;
      },
    } as unknown as Response;

    const { testAiBridge } = await import("../ai.controller");
    await testAiBridge(req, mockRes, vi.fn());

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(aiSpy).toHaveBeenCalledWith(
      "/api/v1/test",
      expect.objectContaining({
        workspaceId: "ws_valid",
        actorId: "usr_1111",
        actorRole: "editor",
        requestId: "req_verified_123",
        input: { prompt: "Analyze" },
      }),
    );
  });

  it("passes error to next middleware if AI service throws", async () => {
    vi.spyOn(
      WorkspaceMemberRepository.prototype,
      "getByWorkspaceAndUser",
    ).mockResolvedValue({
      id: "mem_1",
      workspaceId: "ws_valid",
      userId: "usr_1111",
      role: "owner",
      joinedAt: new Date(),
      deletedAt: null,
      invitedBy: null,
    });

    vi.spyOn(aiServiceClient, "post").mockRejectedValue(
      new AiTimeoutError("AI timed out", "req_timeout_123"),
    );

    const nextFn = vi.fn();
    const req = {
      params: { workspaceId: "ws_valid" },
      user: { id: "usr_1111" },
      id: "req_timeout_123",
      body: {},
      headers: {},
    } as unknown as Request;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const { testAiBridge } = await import("../ai.controller");
    await testAiBridge(req, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalledWith(expect.any(AiTimeoutError));
  });
});
