/**
 * Freelance OS API
 * Main entry point for the backend server
 */

import "dotenv/config";
import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import clientRoutes from "./domains/client/client.routes";
import invoiceRoutes from "./domains/invoice/invoice.routes";
import projectRoutes from "./domains/project/project.routes";
import workspaceRoutes from "./domains/workspace/workspace.routes";

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5000",
    credentials: true,
  }),
);
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Basic routes placeholder
app.get("/", (req, res) => {
  res.json({ message: "Freelance OS API v1" });
});

// API Routes
// Mock auth middleware (MVP only - replace with real auth later)
interface AuthRequest extends Request {
  user?: { id: string };
}

app.use("/api/v1", (req: Request, res: Response, next: NextFunction) => {
  (req as AuthRequest).user = { id: "550e8400-e29b-41d4-a716-446655440000" }; // Proper UUID format
  next();
});

app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/workspaces/:workspaceId/clients", clientRoutes);
app.use("/api/v1/workspaces/:workspaceId/projects", projectRoutes);
app.use("/api/v1/workspaces/:workspaceId/invoices", invoiceRoutes);

// Error handling middleware
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
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

import { workspaceMembersTable, workspacesTable } from "@repo/database";
import { and, eq } from "drizzle-orm";
// Auto-seed default workspace for mock dev user
import { db } from "./db/client";

async function ensureDefaultWorkspace() {
  // Skip auto-seeding in production environment
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const mockId = "550e8400-e29b-41d4-a716-446655440000";
  try {
    const [existingWs] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, mockId));
    if (!existingWs) {
      await db
        .insert(workspacesTable)
        .values({
          id: mockId,
          name: "Default Workspace",
          slug: "default-workspace",
          ownerId: mockId,
          createdBy: mockId,
          updatedBy: mockId,
        })
        .onConflictDoNothing();
    }

    const [existingMember] = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, mockId),
          eq(workspaceMembersTable.userId, mockId),
        ),
      );
    if (!existingMember) {
      await db
        .insert(workspaceMembersTable)
        .values({
          workspaceId: mockId,
          userId: mockId,
          role: "owner",
        })
        .onConflictDoNothing();
    }
  } catch (err) {
    console.error(
      "Auto-seed default workspace notice:",
      err instanceof Error ? err.message : err,
    );
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await ensureDefaultWorkspace();
});

export default app;
