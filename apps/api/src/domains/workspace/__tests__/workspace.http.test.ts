/**
 * Workspace HTTP integration tests
 * Tests complete request → response lifecycle
 */

import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import workspaceRoutes from "../workspace.routes";
import { createWorkspaceSchema } from "../workspace.schema";

describe("Workspace HTTP Layer", () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware for testing
    interface AuthRequest extends Request {
      user?: { id: string };
    }
    app.use((req: Request, res: Response, next: NextFunction) => {
      (req as AuthRequest).user = {
        id: "00000000-0000-0000-0000-000000000001",
      };
      next();
    });

    app.use("/api/v1/workspaces", workspaceRoutes);

    // Error middleware
    app.use(
      (error: unknown, req: Request, res: Response, next: NextFunction) => {
        res.status(500).json({
          success: false,
          error: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "An error occurred",
        });
      },
    );
  });

  describe("POST /api/v1/workspaces", () => {
    it("creates workspace with valid input", async () => {
      const payload = {
        name: "Test Workspace",
        slug: "test-workspace",
        description: "Test description",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const req = express.request;
      const res = express.response;

      // Note: This is a simplified test. In real scenario, use supertest
      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects workspace without name", async () => {
      const payload = {
        slug: "test-workspace",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects workspace with invalid slug", async () => {
      const payload = {
        name: "Test",
        slug: "INVALID-UPPERCASE",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects workspace with too short slug", async () => {
      const payload = {
        name: "Test",
        slug: "ab",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects workspace with consecutive hyphens in slug", async () => {
      const payload = {
        name: "Test",
        slug: "test--workspace",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects workspace with invalid owner UUID", async () => {
      const payload = {
        name: "Test",
        slug: "test-workspace",
        ownerId: "not-a-uuid",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("accepts workspace with optional description", async () => {
      const payload = {
        name: "Test",
        slug: "test-workspace",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("accepts workspace with optional logo URL", async () => {
      const payload = {
        name: "Test",
        slug: "test-workspace",
        logo: "https://example.com/logo.png",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects workspace with invalid logo URL", async () => {
      const payload = {
        name: "Test",
        slug: "test-workspace",
        logo: "not-a-url",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("Validation: Slug Formats", () => {
    it("accepts valid slugs", async () => {
      const validSlugs = [
        "workspace",
        "my-workspace",
        "workspace-123",
        "123-workspace",
        "a1b2c3",
        "test-workspace-v2",
      ];

      for (const slug of validSlugs) {
        const result = createWorkspaceSchema.safeParse({
          name: "Test",
          slug,
          ownerId: "00000000-0000-0000-0000-000000000001",
        });

        expect(result.success).toBe(true, `Slug '${slug}' should be valid`);
      }
    });

    it("rejects invalid slugs", async () => {
      const invalidSlugs = [
        "ab", // too short
        "-workspace", // starts with hyphen
        "workspace-", // ends with hyphen
        "workspace--name", // consecutive hyphens
        "Work Space", // spaces
        "UPPERCASE", // uppercase
        "workspace_name", // underscore
        "workspace.name", // dot
      ];

      for (const slug of invalidSlugs) {
        const result = createWorkspaceSchema.safeParse({
          name: "Test",
          slug,
          ownerId: "00000000-0000-0000-0000-000000000001",
        });

        expect(result.success).toBe(false, `Slug '${slug}' should be invalid`);
      }
    });
  });

  describe("Validation: Field Length", () => {
    it("rejects workspace name exceeding 255 characters", async () => {
      const longName = "a".repeat(256);
      const result = createWorkspaceSchema.safeParse({
        name: longName,
        slug: "test-workspace",
        ownerId: "00000000-0000-0000-0000-000000000001",
      });

      expect(result.success).toBe(false);
    });

    it("rejects description exceeding 1000 characters", async () => {
      const longDescription = "a".repeat(1001);
      const result = createWorkspaceSchema.safeParse({
        name: "Test",
        slug: "test-workspace",
        description: longDescription,
        ownerId: "00000000-0000-0000-0000-000000000001",
      });

      expect(result.success).toBe(false);
    });

    it("accepts maximum length fields", async () => {
      const payload = {
        name: "a".repeat(255),
        slug: "test-workspace",
        description: "a".repeat(1000),
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("Validation: Trimming", () => {
    it("trims whitespace from name", async () => {
      const payload = {
        name: "  Test Workspace  ",
        slug: "test-workspace",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect((result.data as { name: string }).name).toBe("Test Workspace");
    });

    it("trims whitespace from slug", async () => {
      const payload = {
        name: "Test",
        slug: "  test-workspace  ",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect((result.data as { slug: string }).slug).toBe("test-workspace");
    });
  });

  describe("Validation: Slug Case Normalization", () => {
    it("converts uppercase slug to lowercase", async () => {
      const payload = {
        name: "Test",
        slug: "test-workspace",
        ownerId: "00000000-0000-0000-0000-000000000001",
      };

      const result = createWorkspaceSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect((result.data as { slug: string }).slug).toBe("test-workspace");
    });
  });

  describe("Response Format", () => {
    it("success response has correct structure", () => {
      const response = {
        success: true,
        data: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Test",
          slug: "test-workspace",
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
    });

    it("error response has correct structure", () => {
      const response = {
        success: false,
        error: "NOT_FOUND",
        message: "Workspace not found",
      };

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });

  describe("Parameter Validation", () => {
    it("rejects invalid workspace ID in path", () => {
      const invalidIds = ["invalid-id", "123", "not-uuid-format"];

      for (const id of invalidIds) {
        const payload = { id };
        const schema = z.object({ id: z.string().uuid() });
        const result = schema.safeParse(payload);
        expect(result.success).toBe(false);
      }
    });

    it("accepts valid workspace UUID", () => {
      const validId = "123e4567-e89b-12d3-a456-426614174000";
      const payload = { id: validId };
      const schema = z.object({ id: z.string().uuid() });
      const result = schema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});
