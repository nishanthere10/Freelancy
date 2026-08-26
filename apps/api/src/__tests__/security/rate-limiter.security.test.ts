import { beforeEach, describe, expect, it } from "vitest";
import { createRateLimiter } from "../../middleware/rate-limiter.middleware";

describe("Security: Rate Limiting Hardening & Abuse Protection", () => {
  let req: any;
  let res: any;
  let headers: Record<string, string | number>;

  beforeEach(() => {
    headers = {};
    req = {
      method: "POST",
      baseUrl: "/api/v1/workspaces",
      path: "/1111/invoices",
      headers: {
        "x-test-rate-limit": "true",
        "cf-connecting-ip": "203.0.113.195",
      },
    };
    res = {
      statusCode: 200,
      setHeader(name: string, value: string | number) {
        headers[name.toLowerCase()] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
    };
  });

  it("permits requests up to threshold and tracks remaining count", () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 5,
      skipInTest: false,
    });

    for (let i = 1; i <= 5; i++) {
      let nextCalled = false;
      limiter(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
      expect(headers["x-ratelimit-limit"]).toBe(5);
      expect(headers["x-ratelimit-remaining"]).toBe(5 - i);
    }
  });

  it("blocks request exceeding limit with HTTP 429 and sets Retry-After header", () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 3,
      skipInTest: false,
      message: "Custom rate limit exceeded",
    });

    // Fire 3 allowed requests
    for (let i = 0; i < 3; i++) {
      limiter(req, res, () => {});
    }

    // 4th request exceeds threshold
    let nextCalled = false;
    limiter(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toBe("RATE_LIMIT_EXCEEDED");
    expect(res.body.message).toBe("Custom rate limit exceeded");
    expect(headers["retry-after"]).toBeDefined();
    expect(Number(headers["retry-after"])).toBeGreaterThanOrEqual(1);
  });

  it("isolates rate limit buckets across different client IPs", () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 2,
      skipInTest: false,
    });

    // Client 1 maxes out
    req.headers["cf-connecting-ip"] = "1.1.1.1";
    limiter(req, res, () => {});
    limiter(req, res, () => {});

    // Client 1 is blocked
    let client1Blocked = false;
    limiter(req, res, () => {
      client1Blocked = true;
    });
    expect(client1Blocked).toBe(false);
    expect(res.statusCode).toBe(429);

    // Client 2 with different IP is still allowed
    const client2Req: any = {
      ...req,
      headers: {
        "x-test-rate-limit": "true",
        "cf-connecting-ip": "2.2.2.2",
      },
    };
    const client2Res: any = {
      statusCode: 200,
      setHeader: () => {},
      status: () => client2Res,
      json: () => client2Res,
    };
    let client2Allowed = false;
    limiter(client2Req, client2Res, () => {
      client2Allowed = true;
    });

    expect(client2Allowed).toBe(true);
  });
});
