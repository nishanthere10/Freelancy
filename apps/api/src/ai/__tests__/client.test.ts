import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiServiceClient } from "../client";
import {
  AiServiceError,
  AiServiceUnavailableError,
  AiTimeoutError,
} from "../errors";
import type { AiRequestPayload } from "../types";

describe("AiServiceClient", () => {
  const originalFetch = global.fetch;
  let client: AiServiceClient;

  beforeEach(() => {
    client = new AiServiceClient({
      baseUrl: "http://localhost:8000",
      apiKey: "test-secret-key-12345",
      timeoutMs: 1000,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const samplePayload: AiRequestPayload<{ prompt: string }> = {
    workspaceId: "ws_123",
    actorId: "usr_456",
    actorRole: "owner",
    requestId: "req_test_789",
    input: { prompt: "Analyze project scope" },
  };

  it("attaches Authorization header, requestId, and JSON body to POST request", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      capturedUrl = String(url);
      capturedOptions = options;
      return new Response(
        JSON.stringify({
          success: true,
          data: { status: "processed", score: 95 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const result = await client.post<
      { prompt: string },
      { status: string; score: number }
    >("/api/v1/test", samplePayload);

    expect(capturedUrl).toBe("http://localhost:8000/api/v1/test");
    expect(capturedOptions?.method).toBe("POST");

    const headers = capturedOptions?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-secret-key-12345");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["x-request-id"]).toBe("req_test_789");

    const parsedBody = JSON.parse(String(capturedOptions?.body));
    expect(parsedBody.workspaceId).toBe("ws_123");
    expect(parsedBody.actorId).toBe("usr_456");
    expect(parsedBody.actorRole).toBe("owner");
    expect(parsedBody.input.prompt).toBe("Analyze project scope");

    expect(result).toEqual({ status: "processed", score: 95 });
  });

  it("throws AiTimeoutError (status 504) when request times out", async () => {
    global.fetch = vi.fn().mockImplementation(async () => {
      const abortError = new Error("The operation was aborted due to timeout");
      abortError.name = "TimeoutError";
      throw abortError;
    });

    await expect(client.post("/api/v1/test", samplePayload)).rejects.toThrow(
      AiTimeoutError,
    );

    try {
      await client.post("/api/v1/test", samplePayload);
    } catch (err) {
      expect(err).toBeInstanceOf(AiTimeoutError);
      const timeoutErr = err as AiTimeoutError;
      expect(timeoutErr.statusCode).toBe(504);
      expect(timeoutErr.code).toBe("GATEWAY_TIMEOUT");
      expect(timeoutErr.requestId).toBe("req_test_789");
    }
  });

  it("maps 422 validation error envelope from FastAPI into AiServiceError", async () => {
    global.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: [{ field: "input.prompt", issue: "Too short" }],
          requestId: "req_test_789",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    });

    try {
      await client.post("/api/v1/test", samplePayload);
      expect.unreachable("Should have thrown AiServiceError");
    } catch (err) {
      expect(err).toBeInstanceOf(AiServiceError);
      const serviceErr = err as AiServiceError;
      expect(serviceErr.statusCode).toBe(422);
      expect(serviceErr.code).toBe("VALIDATION_ERROR");
      expect(serviceErr.message).toBe("Request validation failed");
      expect(serviceErr.details).toEqual([
        { field: "input.prompt", issue: "Too short" },
      ]);
      expect(serviceErr.requestId).toBe("req_test_789");
    }
  });

  it("maps 401 unauthorized envelope from FastAPI into AiServiceError", async () => {
    global.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UNAUTHORIZED",
          message: "Invalid API key",
          requestId: "req_test_789",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    });

    try {
      await client.post("/api/v1/test", samplePayload);
      expect.unreachable("Should have thrown AiServiceError");
    } catch (err) {
      expect(err).toBeInstanceOf(AiServiceError);
      const serviceErr = err as AiServiceError;
      expect(serviceErr.statusCode).toBe(401);
      expect(serviceErr.code).toBe("UNAUTHORIZED");
      expect(serviceErr.message).toBe("Invalid API key");
    }
  });

  it("throws AiServiceUnavailableError when network fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

    await expect(client.post("/api/v1/test", samplePayload)).rejects.toThrow(
      AiServiceUnavailableError,
    );
  });

  it("executes unauthenticated checkHealth probe", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ status: "ok", service: "freelance-os-ai" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const health = await client.checkHealth();
    expect(health.status).toBe("ok");
    expect(health.service).toBe("freelance-os-ai");
  });
});
