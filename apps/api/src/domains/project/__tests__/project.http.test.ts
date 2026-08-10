import { describe, expect, it } from "vitest";
import {
  changeProjectStatusSchema,
  createProjectSchema,
  projectParamsSchema,
} from "../project.schema";

describe("Project Validation Schemas & Parameters", () => {
  it("GET / validation - rejects non-UUID workspaceId", () => {
    const res = projectParamsSchema.safeParse({
      workspaceId: "invalid-uuid",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors;
      expect(fieldErrors.workspaceId).toBeDefined();
    }
  });

  it("POST / validation - requires project name", () => {
    const res = createProjectSchema.safeParse({ name: "" });
    expect(res.success).toBe(false);
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors;
      expect(fieldErrors.name).toBeDefined();
    }
  });

  it("POST / validation - rejects targetDate before startDate", () => {
    const res = createProjectSchema.safeParse({
      name: "Test Project",
      startDate: "2026-10-01",
      targetDate: "2026-09-01",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors;
      expect(fieldErrors.targetDate).toBeDefined();
    }
  });

  it("PATCH /:projectId/status - validates status enum", () => {
    const res = changeProjectStatusSchema.safeParse({
      status: "invalid_status",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors;
      expect(fieldErrors.status).toBeDefined();
    }
  });
});
