import express from "express";
import supertest from "supertest";
import { describe, expect, it } from "vitest";
import projectRoutes from "../project.routes";

const app = express();
app.use(express.json());

// Auth middleware mock
app.use("/api/v1/workspaces/:workspaceId/projects", (req, _res, next) => {
  (req as any).user = { id: "u1111111-1111-1111-1111-111111111111" };
  next();
});

app.use("/api/v1/workspaces/:workspaceId/projects", projectRoutes);

describe("Project HTTP Routes", () => {
  const workspaceId = "w1111111-1111-1111-1111-111111111111";

  it("GET / validation - rejects non-UUID workspaceId", async () => {
    const res = await supertest(app).get("/api/v1/workspaces/invalid-uuid/projects");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST / validation - requires project name", async () => {
    const res = await supertest(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST / validation - rejects targetDate before startDate", async () => {
    const res = await supertest(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .send({
        name: "Test Project",
        startDate: "2026-10-01",
        targetDate: "2026-09-01",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH /:projectId/status - validates status enum", async () => {
    const res = await supertest(app)
      .patch(`/api/v1/workspaces/${workspaceId}/projects/p1111111-1111-1111-1111-111111111111/status`)
      .send({ status: "invalid_status" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
