import { describe, expect, it } from "vitest";
import app from "../app";
import worker, { handleExpressRequest } from "../worker";

describe("Cloudflare Worker Entrypoint & Express Bridge", () => {
  it("should handle GET /health via handleExpressRequest and return 200 OK", async () => {
    const request = new Request("http://localhost:5001/health", {
      method: "GET",
    });

    const response = await handleExpressRequest(app, request as any);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("should handle GET / via worker.fetch export and return API v1 message", async () => {
    const request = new Request("http://localhost:5001/", {
      method: "GET",
    });

    const response = await worker.fetch(
      request as any,
      { NODE_ENV: "test" },
      {} as any,
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ message: "Freelance OS API v1" });
  });

  it("should handle 404 for non-existent routes", async () => {
    const request = new Request("http://localhost:5001/api/v1/nonexistent", {
      method: "GET",
    });

    const response = await worker.fetch(
      request as any,
      { NODE_ENV: "test" },
      {} as any,
    );
    expect(response.status).toBe(404);
  });
});
