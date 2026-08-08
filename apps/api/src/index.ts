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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
