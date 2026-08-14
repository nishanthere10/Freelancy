/**
 * Express Application Configuration
 * Decoupled from server listener for dual Node.js and Cloudflare Workers runtime compatibility.
 */

import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { config } from "./config";
import clientRoutes from "./domains/client/client.routes";
import dashboardRoutes from "./domains/dashboard/dashboard.routes";
import invoiceRoutes from "./domains/invoice/invoice.routes";
import projectRoutes from "./domains/project/project.routes";
import workspaceRoutes from "./domains/workspace/workspace.routes";
import {
  clerkAuth,
  userResolverMiddleware,
} from "./middleware/auth.middleware";

export const app: Application = express();

// Global Middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://freelancy-omega.vercel.app',
    'http://localhost:5000',
    'http://localhost:3000'
  ];
  
  if (config.frontendUrl && !allowedOrigins.includes(config.frontendUrl)) {
    allowedOrigins.push(config.frontendUrl);
  }

  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })(req, res, next);
});
// Health check endpoint (Liveness probe)
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Basic route placeholder
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Freelance OS API v1" });
});

// Authenticated API Routes
app.use("/api/v1", clerkAuth, userResolverMiddleware);

// Parse JSON bodies only after authentication to prevent Clerk from hitting locked streams
app.use(express.json());

app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/workspaces/:workspaceId/dashboard", dashboardRoutes);
app.use("/api/v1/workspaces/:workspaceId/clients", clientRoutes);
app.use("/api/v1/workspaces/:workspaceId/projects", projectRoutes);
app.use("/api/v1/workspaces/:workspaceId/invoices", invoiceRoutes);

// Catch-all 404 handler — must be registered after all domain routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

// Global Error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("API Error:", err);
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  });
});

export default app;
