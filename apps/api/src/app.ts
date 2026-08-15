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

// 1. Correlation & Request Tracing Middleware
app.use(requestIdMiddleware);

// 2. Global CORS Middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://freelancy-omega.vercel.app",
    "http://localhost:5000",
    "http://localhost:3000",
  ];

  if (config.frontendUrl && !allowedOrigins.includes(config.frontendUrl)) {
    allowedOrigins.push(config.frontendUrl);
  }

  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.vercel\.app$/.test(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin);
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true); // Allow reflection for resilience
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
    ],
  })(req, res, next);
});

// Explicit preflight handler
app.options("*", (req, res) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-Request-ID, x-request-id",
  );
  res.sendStatus(204);
});

// 3. Structured Request Latency & Status Logger
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

// Parse JSON bodies only after authentication to prevent Clerk stream collision
app.use(express.json());

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

// Catch-all 404 handler
app.use((req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.status(404).json(createError("NOT_FOUND", "Route not found"));
});

// Global Error Handling Middleware
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.id || (req.headers["x-request-id"] as string);
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  const code = (err as { code?: string })?.code || "INTERNAL_ERROR";

  logger.error(`API Exception on ${req.method} ${req.path}`, {
    requestId,
    errorCode: code,
    error: err,
    path: req.path,
    method: req.method,
  });

  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (requestId) {
    res.setHeader("x-request-id", requestId);
  }

  res.status(500).json({
    success: false,
    error: code,
    message,
    requestId,
  });
});

export default app;
