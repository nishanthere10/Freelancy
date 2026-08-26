import { describe, expect, it } from "vitest";
import app, { isAllowedOrigin } from "../../app";
import { handleExpressRequest } from "../../worker";

describe("Security: CORS & Security Headers Hardening", () => {
  describe("isAllowedOrigin() Unit Boundary Tests", () => {
    it("approves production frontend domain", () => {
      expect(isAllowedOrigin("https://freelancy-omega.vercel.app")).toBe(true);
    });

    it("approves preview vercel deployments matching regex", () => {
      expect(isAllowedOrigin("https://freelancy-preview-123.vercel.app")).toBe(
        true,
      );
      expect(isAllowedOrigin("https://freelance-os-git-feat.vercel.app")).toBe(
        true,
      );
    });

    it("approves local development origins", () => {
      expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
      expect(isAllowedOrigin("http://localhost:5000")).toBe(true);
      expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
    });

    it("strictly rejects unauthorized and malicious origins", () => {
      expect(isAllowedOrigin("https://evil-attacker.com")).toBe(false);
      expect(
        isAllowedOrigin("https://freelancy-omega.vercel.app.attacker.com"),
      ).toBe(false);
      expect(isAllowedOrigin("http://malicious-site.io")).toBe(false);
      expect(isAllowedOrigin("null")).toBe(false);
      expect(isAllowedOrigin(undefined)).toBe(false);
      expect(isAllowedOrigin("")).toBe(false);
    });
  });

  describe("Worker & Express Security Headers", () => {
    it("returns standard API defense-in-depth headers on /health", async () => {
      const workerReq: any = {
        url: "https://api.freelance-os.local/health",
        method: "GET",
        headers: new Map(),
      };

      const res = await handleExpressRequest(app, workerReq);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("strict-transport-security")).toContain(
        "max-age=",
      );
      expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    });

    it("returns Cache-Control: no-store on private authenticated routes", async () => {
      const workerReq: any = {
        url: "https://api.freelance-os.local/api/v1/workspaces",
        method: "GET",
        headers: new Map([
          ["x-mock-user-id", "550e8400-e29b-41d4-a716-446655440000"],
        ]),
      };

      const res = await handleExpressRequest(app, workerReq);
      expect(res.headers.get("cache-control")).toBe("no-store, max-age=0");
    });

    it("does not reflect unauthorized origin in Access-Control-Allow-Origin header", async () => {
      const workerReq: any = {
        url: "https://api.freelance-os.local/health",
        method: "GET",
        headers: new Map([["origin", "https://evil-attacker.com"]]),
      };

      const res = await handleExpressRequest(app, workerReq);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("reflects approved origin in Access-Control-Allow-Origin header", async () => {
      const workerReq: any = {
        url: "https://api.freelance-os.local/health",
        method: "GET",
        headers: new Map([["origin", "https://freelancy-omega.vercel.app"]]),
      };

      const res = await handleExpressRequest(app, workerReq);
      expect(res.headers.get("access-control-allow-origin")).toBe(
        "https://freelancy-omega.vercel.app",
      );
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    });
  });
});
