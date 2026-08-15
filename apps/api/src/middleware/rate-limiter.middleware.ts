import type { NextFunction, Request, Response } from "express";
import { createError } from "../utils/response";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs?: number; // Time window in ms (default: 60,000 = 1 min)
  max?: number; // Max requests per window (default: 120)
  message?: string;
}

/**
 * In-memory sliding window rate limiter
 * Serverless-compatible, zero-dependency protection for Cloudflare Workers & Node.js
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || 60_000;
  const maxRequests = options.max || 120;
  const message =
    options.message || "Too many requests, please try again later.";

  const store = new Map<string, RateLimitRecord>();

  // Periodically cleanup expired entries to prevent memory growth
  let lastCleanup = Date.now();
  const cleanup = () => {
    const now = Date.now();
    if (now - lastCleanup > windowMs) {
      for (const [key, record] of store.entries()) {
        if (record.resetAt <= now) {
          store.delete(key);
        }
      }
      lastCleanup = now;
    }
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Bypass in test environments
    if (process.env.NODE_ENV === "test") {
      next();
      return;
    }

    cleanup();

    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown-client";

    const key = `${req.method}:${req.baseUrl || req.path}:${clientIp}`;
    const now = Date.now();

    const record = store.get(key);

    if (!record || record.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));
      next();
      return;
    }

    record.count += 1;
    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetAt / 1000));

    if (record.count > maxRequests) {
      const requestId = req.id || (req.headers["x-request-id"] as string);
      res
        .status(429)
        .json(
          createError("RATE_LIMIT_EXCEEDED", message, undefined, requestId),
        );
      return;
    }

    next();
  };
}

export const generalRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 300,
  message: "Rate limit exceeded. Please slow down requests.",
});

export const strictMutationRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: "Mutation rate limit exceeded. Please wait a moment.",
});
