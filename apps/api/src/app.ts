/**
 * Express Application Configuration
 * Decoupled from server listener for dual Node.js and Cloudflare Workers runtime compatibility.
 */

import cors from "cors";
import { sql } from "drizzle-orm";
import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { config } from "./config";
import { db } from "./db/client";
import activityRoutes from "./domains/activity/activity.routes";
import aiRoutes from "./domains/ai/ai.routes";
import clientRoutes from "./domains/client/client.routes";
import dashboardRoutes from "./domains/dashboard/dashboard.routes";
import invoiceRoutes from "./domains/invoice/invoice.routes";
import projectRoutes from "./domains/project/project.routes";
import workspaceRoutes from "./domains/workspace/workspace.routes";
import {
  clerkAuth,
  userResolverMiddleware,
} from "./middleware/auth.middleware";
import {
  generalRateLimiter,
  strictMutationRateLimiter,
} from "./middleware/rate-limiter.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware";
import { logger } from "./utils/logger";
import { createError } from "./utils/response";

const app: Application = express();

/**
 * Validates whether an incoming HTTP origin matches approved security boundaries.
 */
export function isAllowedOrigin(origin?: string | null): boolean {
  if (!origin) return false;
  const allowedOrigins = [
    "https://freelancy-omega.vercel.app",
    "http://localhost:5000",
    "http://localhost:3000",
  ];

  if (config.frontendUrl && !allowedOrigins.includes(config.frontendUrl)) {
    allowedOrigins.push(config.frontendUrl);
  }

  if (allowedOrigins.includes(origin)) return true;
  if (
    /^https:\/\/(freelancy|freelance-os)[a-zA-Z0-9-]*\.vercel\.app$/.test(
      origin,
    )
  ) {
    return true;
  }
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;

  return false;
}

// 1. Correlation & Request Tracing Middleware
app.use(requestIdMiddleware);

// 2. Global CORS Middleware (Strict Origin Validation)
app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // Direct non-browser / server-to-server requests
        return callback(null, true);
      }
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        // Block arbitrary reflection
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-ID",
      "x-request-id",
      "Idempotency-Key",
      "idempotency-key",
    ],
  })(req, res, next);
});

// Explicit preflight handler
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Request-ID, x-request-id, Idempotency-Key, idempotency-key",
    );
  }
  res.status(204).end();
});

// 3. API Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
  }
  next();
});

// 4. Structured Request Latency & Status Logger
app.use(requestLoggerMiddleware);

// ==========================================
// Health & Diagnostic Probes
// ==========================================

// Liveness Probe
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Readiness Probe (Verifies PostgreSQL connectivity)
app.get("/health/ready", async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    // Lightweight database query check
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - startTime;

    res.status(200).json({
      status: "ready",
      database: "connected",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    logger.error("Database readiness check failed", {
      error: err,
      latencyMs,
    });

    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }
});

// Deployment Version Probe
app.get("/version", (_req: Request, res: Response) => {
  res.status(200).json({
    version: process.env.npm_package_version || "0.0.1",
    environment: config.env,
    commitSha:
      process.env.GIT_COMMIT_SHA ||
      process.env.CF_PAGES_COMMIT_SHA ||
      "development",
    timestamp: new Date().toISOString(),
  });
});

// Root Info
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Freelance OS API v1" });
});

// ==========================================
// Authenticated API Routes
// ==========================================
app.use("/api/v1", generalRateLimiter);
app.use("/api/v1", clerkAuth, userResolverMiddleware);

// Parse JSON bodies bounded to 1MB to protect against memory exhaustion DoS
app.use(express.json({ limit: "1mb" }));

// Domain Routes
app.use("/api/v1/workspaces", strictMutationRateLimiter, workspaceRoutes);
app.use("/api/v1/workspaces/:workspaceId/dashboard", dashboardRoutes);
app.use(
  "/api/v1/workspaces/:workspaceId/clients",
  strictMutationRateLimiter,
  clientRoutes,
);
app.use(
  "/api/v1/workspaces/:workspaceId/projects",
  strictMutationRateLimiter,
  projectRoutes,
);
app.use(
  "/api/v1/workspaces/:workspaceId/invoices",
  strictMutationRateLimiter,
  invoiceRoutes,
);
app.use("/api/v1/workspaces/:workspaceId/activity", activityRoutes);
app.use(
  "/api/v1/workspaces/:workspaceId/ai",
  strictMutationRateLimiter,
  aiRoutes,
);

// Catch-all 404 handler
app.use((req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Request-ID, x-request-id, Idempotency-Key, idempotency-key",
    );
  }
  res.status(404).json(createError("NOT_FOUND", "Route not found"));
});

// Global Error Handling Middleware
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.id || (req.headers["x-request-id"] as string);
  const errorObj = err as {
    type?: string;
    status?: number;
    statusCode?: number;
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };

  // Handle Payload Too Large from body-parser
  if (errorObj?.type === "entity.too.large" || errorObj?.status === 413) {
    return res
      .status(413)
      .json(
        createError(
          "PAYLOAD_TOO_LARGE",
          "Request payload exceeds the maximum limit of 1MB",
          undefined,
          requestId,
        ),
      );
  }

  const statusCode = errorObj?.statusCode || errorObj?.status || 500;
  const isProd = process.env.NODE_ENV === "production";
  const code = errorObj?.code || "INTERNAL_ERROR";
  const message =
    statusCode >= 500 && isProd
      ? "An unexpected internal error occurred"
      : err instanceof Error
        ? err.message
        : "An unexpected error occurred";

  logger.error(`API Exception on ${req.method} ${req.path}`, {
    requestId,
    errorCode: code,
    statusCode,
    error: err,
    path: req.path,
    method: req.method,
  });

  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Request-ID, x-request-id, Idempotency-Key, idempotency-key",
    );
  }
  if (requestId) {
    res.setHeader("x-request-id", requestId);
  }

  res
    .status(statusCode)
    .json(createError(code, message, errorObj?.details, requestId));
});

export default app;
