import type { Request as WorkerRequest } from "@cloudflare/workers-types";
import express from "express";
import { describe, expect, it } from "vitest";
import app from "../app";
import { createRateLimiter } from "../middleware/rate-limiter.middleware";
import { sanitizeLogValue } from "../utils/logger";
import { handleExpressRequest } from "../worker";

function createMockWorkerRequest(
  urlPath: string,
  method = "GET",
  headers: Record<string, string> = {},
): WorkerRequest {
  const url = `http://localhost${urlPath}`;
  const headerMap = new Map<string, string>(Object.entries(headers));

  return {
    url,
    method,
    headers: {
      get: (key: string) => headerMap.get(key.toLowerCase()) || null,
      forEach: (cb: (value: string, key: string) => void) => {
        headerMap.forEach((v, k) => cb(v, k));
      },
    },
    body: null,
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as WorkerRequest;
}

describe("Observability & Reliability Architecture", () => {
  describe("Request ID & Correlation", () => {
    it("assigns unique x-request-id header when none is provided", async () => {
      const workerReq = createMockWorkerRequest("/health");
      const res = await handleExpressRequest(app, workerReq);

      expect(res.status).toBe(200);
      const requestId = res.headers.get("x-request-id");
      expect(requestId).toBeDefined();
      expect(requestId).toMatch(/^req_[a-zA-Z0-9]+$/);
    });

    it("propagates valid existing x-request-id header", async () => {
      const customId = "trace-client-abc-123";
      const workerReq = createMockWorkerRequest("/health", "GET", {
        "x-request-id": customId,
      });
      const res = await handleExpressRequest(app, workerReq);

      expect(res.status).toBe(200);
      expect(res.headers.get("x-request-id")).toBe(customId);
    });
  });

  describe("Health & Diagnostic Probes", () => {
    it("GET /health returns 200 OK with timestamp", async () => {
      const workerReq = createMockWorkerRequest("/health");
      const res = await handleExpressRequest(app, workerReq);
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("status", "ok");
      expect(body).toHaveProperty("timestamp");
    });

    it("GET /version returns environment and version information safely", async () => {
      const workerReq = createMockWorkerRequest("/version");
      const res = await handleExpressRequest(app, workerReq);
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("version");
      expect(body).toHaveProperty("environment");
      expect(body).toHaveProperty("commitSha");
      expect(body).toHaveProperty("timestamp");
    });

    it("GET / returns API info", async () => {
      const workerReq = createMockWorkerRequest("/");
      const res = await handleExpressRequest(app, workerReq);
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("message", "Freelance OS API v1");
    });
  });

  describe("Security & Secret Redaction in Logger", () => {
    it("redacts sensitive credential keys in object structures", () => {
      const payload = {
        username: "developer",
        password: "SuperSecretPassword123!",
        authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        database_url:
          "postgresql://postgres:secretpassword@ep-test.neon.tech/main?sslmode=require",
        clerkSecretKey: "sk_live_abcdef123456",
        safeMeta: {
          workspaceId: "ws-123",
          apiKey: "sk-should-be-masked",
        },
      };

      const sanitized = sanitizeLogValue(payload) as Record<string, unknown>;

      expect(sanitized.username).toBe("developer");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.authorization).toBe("[REDACTED]");
      expect(sanitized.database_url).toBe("[REDACTED]");
      expect(sanitized.clerkSecretKey).toBe("[REDACTED]");
      expect((sanitized.safeMeta as Record<string, unknown>).workspaceId).toBe(
        "ws-123",
      );
      expect((sanitized.safeMeta as Record<string, unknown>).apiKey).toBe(
        "[REDACTED]",
      );
    });

    it("redacts Bearer tokens and Postgres credentials embedded in raw strings", () => {
      const strWithToken =
        "Error processing request with header Bearer eyJhbGciOiJ...";
      const sanitizedStr = sanitizeLogValue(strWithToken);
      expect(sanitizedStr).toBe(
        "Error processing request with header Bearer [REDACTED]",
      );

      const strWithDb =
        "Failed connecting to postgresql://user:mysecretpass@localhost:5432/db";
      const sanitizedDb = sanitizeLogValue(strWithDb);
      expect(sanitizedDb).toBe(
        "Failed connecting to postgresql://[REDACTED]:[REDACTED]@localhost:5432/db",
      );
    });
  });

  describe("Error Handling & Contract Normalization", () => {
    it("GET non-existent route returns normalized 404 error envelope with x-request-id", async () => {
      const workerReq = createMockWorkerRequest("/api/v1/non-existent-route");
      const res = await handleExpressRequest(app, workerReq);
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toBe(404);
      expect(body).toHaveProperty("success", false);
      expect(body).toHaveProperty("error", "NOT_FOUND");
      expect(body).toHaveProperty("message", "Route not found");
      expect(res.headers.get("x-request-id")).toBeDefined();
    });
  });

  describe("Rate Limiting Middleware", () => {
    it("blocks requests when rate limit is exceeded", async () => {
      const testApp = express();
      const limiter = createRateLimiter({ windowMs: 10_000, max: 2 });

      testApp.use((req, res, next) => {
        // Force test rate limiter execution by mocking NODE_ENV check
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";
        limiter(req, res, () => {
          process.env.NODE_ENV = originalEnv;
          next();
        });
      });

      testApp.get("/test-limit", (_req, res) => {
        res.json({ ok: true });
      });

      const workerReq1 = createMockWorkerRequest("/test-limit");
      const res1 = await handleExpressRequest(testApp, workerReq1);
      expect(res1.status).toBe(200);

      const workerReq2 = createMockWorkerRequest("/test-limit");
      const res2 = await handleExpressRequest(testApp, workerReq2);
      expect(res2.status).toBe(200);

      // 3rd request exceeds max=2
      const workerReq3 = createMockWorkerRequest("/test-limit");
      const res3 = await handleExpressRequest(testApp, workerReq3);
      expect(res3.status).toBe(429);
      const body3 = (await res3.json()) as Record<string, unknown>;
      expect(body3).toHaveProperty("error", "RATE_LIMIT_EXCEEDED");
    });
  });
});
