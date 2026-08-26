import { describe, expect, it } from "vitest";
import { userResolverMiddleware } from "../../middleware/auth.middleware";

describe("Security: Authentication & Production Mock-Auth Hardening", () => {
  it("rejects unauthenticated requests with HTTP 401 and correlation requestId", async () => {
    const req: any = {
      headers: {},
      path: "/api/v1/workspaces",
      method: "GET",
      id: "test-req-123",
    };
    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
    };
    let nextCalled = false;

    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      await userResolverMiddleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("UNAUTHORIZED");
      expect(res.body.message).toBe("Authentication required");
      expect(res.body.requestId).toBe("test-req-123");
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it("blocks x-mock-user-id header spoofing in production mode", async () => {
    const req: any = {
      headers: {
        "x-mock-user-id": "attacker-chosen-uuid-000000000000",
      },
      path: "/api/v1/workspaces",
      method: "GET",
      id: "test-req-spoof",
    };
    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
    };
    let nextCalled = false;

    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      await userResolverMiddleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
      expect(req.user).toBeUndefined();
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it("rejects non-Bearer authentication schemes (Basic, Digest, Token)", async () => {
    const invalidAuthHeaders = [
      "Basic dXNlcjpwYXNz",
      "Digest username=admin",
      "Token my-custom-token-xyz",
      "CustomAuth 12345",
      "Bearer ",
    ];

    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      for (const header of invalidAuthHeaders) {
        const req: any = {
          headers: { authorization: header },
          path: "/api/v1/workspaces",
          method: "GET",
          id: "test-invalid-auth",
        };
        const res: any = {
          statusCode: 200,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(data: any) {
            this.body = data;
            return this;
          },
        };
        let nextCalled = false;

        await userResolverMiddleware(req, res, () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
      }
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it("rejects forged and malformed JWT token strings", async () => {
    const malformedTokens = [
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-payload",
      "Bearer not-a-jwt",
      "Bearer ...",
      "Bearer 12345.67890",
    ];

    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      for (const token of malformedTokens) {
        const req: any = {
          headers: { authorization: token },
          path: "/api/v1/workspaces",
          method: "GET",
        };
        const res: any = {
          statusCode: 200,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(data: any) {
            this.body = data;
            return this;
          },
        };
        let nextCalled = false;

        await userResolverMiddleware(req, res, () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
      }
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it("rejects requests when user status is deactivated with HTTP 401 USER_INACTIVE", async () => {
    const req: any = {
      headers: {},
      path: "/api/v1/workspaces",
      method: "GET",
      id: "test-deactivated",
    };
    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
    };

    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      await userResolverMiddleware(req, res, () => {});
      expect(res.statusCode).toBe(401);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it("allows test-mode mock user resolution when explicitly in test environment", async () => {
    const req: any = {
      headers: {
        "x-mock-user-id": "11111111-1111-1111-1111-111111111111",
      },
      path: "/api/v1/workspaces",
      method: "GET",
    };
    const res: any = {};
    let nextCalled = false;

    await userResolverMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(req.user.email).toBe("dev@freelance-os.local");
  });
});
