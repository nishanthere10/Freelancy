import type { Project, ScopeAnalysis } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceService } from "../../invoice/invoice.service";
import { ProjectService } from "../../project/project.service";
import { ProjectDeliverableRepository } from "../../project/repository/project-deliverable.repository";
import { AiService } from "../ai.service";
import { ScopeAnalysisRepository } from "../repository";

describe("Scope Conversion Concurrency & Rollback Tests", () => {
  const workspaceId = "w0000000-0000-0000-0000-000000000001";
  const scopeId = "s0000000-0000-0000-0000-000000000001";
  const actorId = "u0000000-0000-0000-0000-000000000001";

  let mockScopeRepo: any;
  let mockProjectService: any;
  let mockDeliverableRepo: any;
  let mockInvoiceService: any;
  let aiService: AiService;

  const mockScope: ScopeAnalysis = {
    id: scopeId,
    workspaceId,
    projectId: null,
    actorUserId: actorId,
    inputText: "Build me a CRM system",
    result: {
      summary: "Full Stack CRM",
      deliverables: [
        {
          title: "User Management",
          description: "Auth and roles",
          estimated_hours: 10,
          complexity: "medium",
        },
        {
          title: "Pipeline View",
          description: "Deals board",
          estimated_hours: 15,
          complexity: "high",
        },
      ],
      timeline_weeks: 3,
      confidence_score: 92,
    },
    confirmedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    let currentScope = { ...mockScope };

    mockScopeRepo = {
      findById: vi.fn().mockImplementation(async (sId: string, wId: string) => {
        if (sId === scopeId && wId === workspaceId) {
          return currentScope;
        }
        return null;
      }),
      linkProjectAtomic: vi
        .fn()
        .mockImplementation(async (sId: string, wId: string, pId: string) => {
          if (
            sId === scopeId &&
            wId === workspaceId &&
            !currentScope.projectId &&
            currentScope.confirmedAt
          ) {
            currentScope = { ...currentScope, projectId: pId };
            return currentScope;
          }
          return null; // Atomic CAS fails if already linked
        }),
      unlinkProject: vi
        .fn()
        .mockImplementation(async (sId: string, wId: string) => {
          if (sId === scopeId && wId === workspaceId) {
            currentScope = { ...currentScope, projectId: null };
            return currentScope;
          }
          return null;
        }),
    };

    let nextProjId = 1;
    mockProjectService = {
      createProject: vi.fn().mockImplementation(async (input: any) => {
        const id = `proj-${nextProjId++}`;
        return {
          success: true,
          data: {
            id,
            workspaceId,
            name: input.name,
            budgetAmount: input.budgetAmount
              ? String(input.budgetAmount)
              : null,
          } as Project,
        };
      }),
      deleteProject: vi.fn().mockResolvedValue({ success: true, data: true }),
    };

    mockDeliverableRepo = {
      createMany: vi.fn().mockResolvedValue([]),
      deleteByProject: vi.fn().mockResolvedValue(0),
    };

    mockInvoiceService = {
      createInvoice: vi.fn().mockResolvedValue({
        success: true,
        data: { id: "inv-deposit-1", status: "draft" },
      }),
    };

    aiService = new AiService(
      mockScopeRepo,
      {} as any,
      {} as any,
      mockProjectService,
      mockInvoiceService,
      mockDeliverableRepo,
    );
  });

  it("concurrency race: 2 simultaneous conversion calls result in exactly 1 project and 1 conflict", async () => {
    const convertPromise1 = aiService.convertScopeToProject({
      workspaceId,
      actorId,
      scopeId,
      projectData: {
        name: "Project A",
        depositPercentage: 0,
        depositDueDays: 14,
        status: "active",
        currency: "USD",
      },
    });

    const convertPromise2 = aiService.convertScopeToProject({
      workspaceId,
      actorId,
      scopeId,
      projectData: {
        name: "Project B",
        depositPercentage: 0,
        depositDueDays: 14,
        status: "active",
        currency: "USD",
      },
    });

    const [res1, res2] = await Promise.allSettled([
      convertPromise1,
      convertPromise2,
    ]);

    const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejected = [res1, res2].filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectedReason.code).toBe("ALREADY_CONVERTED");
    expect(rejectedReason.statusCode).toBe(409);

    // Assert compensating cleanup was invoked for the loser of the race
    expect(mockProjectService.deleteProject).toHaveBeenCalledTimes(1);
  });

  it("Case A rollback: if deliverable materialization fails, project is deleted and scope unlinked", async () => {
    mockDeliverableRepo.createMany.mockRejectedValue(
      new Error("Database connection dropped"),
    );

    await expect(
      aiService.convertScopeToProject({
        workspaceId,
        actorId,
        scopeId,
        projectData: {
          name: "Project Rollback Test",
          depositPercentage: 0,
          depositDueDays: 14,
          status: "active",
          currency: "USD",
        },
      }),
    ).rejects.toMatchObject({
      code: "DELIVERABLE_MATERIALIZATION_FAILED",
      statusCode: 500,
    });

    // Verify compensating actions were called
    expect(mockDeliverableRepo.deleteByProject).toHaveBeenCalled();
    expect(mockProjectService.deleteProject).toHaveBeenCalled();
    expect(mockScopeRepo.unlinkProject).toHaveBeenCalled();
  });

  it("Case B rollback: if deposit invoice creation fails, deliverables and project are cleaned up", async () => {
    mockInvoiceService.createInvoice.mockResolvedValue({
      success: false,
      error: { code: "INVALID_CLIENT", message: "Client is archived" },
    });

    await expect(
      aiService.convertScopeToProject({
        workspaceId,
        actorId,
        scopeId,
        projectData: {
          name: "Project Invoice Fail",
          clientId: "c0000000-0000-0000-0000-000000000001",
          depositPercentage: 50,
          budget: 5000,
          depositDueDays: 14,
          status: "active",
          currency: "USD",
        },
      }),
    ).rejects.toMatchObject({
      code: "INVOICE_CREATION_FAILED",
      statusCode: 400,
    });

    // Verify rollback
    expect(mockDeliverableRepo.deleteByProject).toHaveBeenCalled();
    expect(mockProjectService.deleteProject).toHaveBeenCalled();
    expect(mockScopeRepo.unlinkProject).toHaveBeenCalled();
  });
});
