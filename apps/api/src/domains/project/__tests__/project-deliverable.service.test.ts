import type {
  Project,
  ProjectDeliverable,
  WorkspaceMember,
} from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InvoiceService } from "../../invoice/invoice.service";
import type { WorkspaceMemberRepository } from "../../workspace/repository";
import {
  ProjectDeliverableNotFoundError,
  ProjectDeliverablePermissionDeniedError,
  ProjectDeliverableValidationError,
} from "../project-deliverable.errors";
import { ProjectDeliverableService } from "../project-deliverable.service";
import type { ProjectDeliverableRepository } from "../repository/project-deliverable.repository";
import type { ProjectRepository } from "../repository/project.repository";

class FakeDeliverableRepository
  implements Partial<ProjectDeliverableRepository>
{
  private deliverables: Map<string, ProjectDeliverable> = new Map();
  private nextId = 1;

  async create(data: any): Promise<ProjectDeliverable> {
    const id = `deliv-${this.nextId++}`;
    const now = new Date();
    const record: ProjectDeliverable = {
      id,
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      estimatedHours: data.estimatedHours || "0.00",
      loggedHours: data.loggedHours || "0.00",
      complexity: data.complexity || "medium",
      status: data.status || "pending",
      position: data.position || 0,
      sourceScopeId: data.sourceScopeId || null,
      invoiceId: data.invoiceId || null,
      billedAt: data.billedAt || null,
      completedAt: data.completedAt || null,
      createdAt: now,
      updatedAt: now,
    };
    this.deliverables.set(id, record);
    return record;
  }

  async createMany(data: any[]): Promise<ProjectDeliverable[]> {
    const records: ProjectDeliverable[] = [];
    for (const d of data) {
      records.push(await this.create(d));
    }
    return records;
  }

  async getById(
    id: string,
    projectId: string,
    workspaceId: string,
  ): Promise<ProjectDeliverable | null> {
    const d = this.deliverables.get(id);
    if (!d || d.projectId !== projectId || d.workspaceId !== workspaceId) {
      return null;
    }
    return d;
  }

  async listByProject(
    projectId: string,
    workspaceId: string,
  ): Promise<ProjectDeliverable[]> {
    return Array.from(this.deliverables.values()).filter(
      (d) => d.projectId === projectId && d.workspaceId === workspaceId,
    );
  }

  async update(
    id: string,
    projectId: string,
    workspaceId: string,
    data: any,
  ): Promise<ProjectDeliverable | null> {
    const existing = await this.getById(id, projectId, workspaceId);
    if (!existing) return null;

    const updated: ProjectDeliverable = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.deliverables.set(id, updated);
    return updated;
  }

  async delete(
    id: string,
    projectId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const existing = await this.getById(id, projectId, workspaceId);
    if (!existing) return false;
    this.deliverables.delete(id);
    return true;
  }

  async atomicClaimBilled(
    deliverableIds: string[],
    projectId: string,
    workspaceId: string,
    invoiceId: string,
  ): Promise<ProjectDeliverable[]> {
    const claimed: ProjectDeliverable[] = [];
    for (const id of deliverableIds) {
      const d = await this.getById(id, projectId, workspaceId);
      if (d && d.status === "completed" && !d.billedAt) {
        d.billedAt = new Date();
        d.invoiceId = invoiceId;
        d.updatedAt = new Date();
        claimed.push(d);
      }
    }
    return claimed;
  }

  async unbillByInvoiceId(
    invoiceId: string,
    projectId: string,
    workspaceId: string,
  ): Promise<number> {
    let count = 0;
    for (const d of this.deliverables.values()) {
      if (
        d.invoiceId === invoiceId &&
        d.projectId === projectId &&
        d.workspaceId === workspaceId
      ) {
        d.billedAt = null;
        d.invoiceId = null;
        count++;
      }
    }
    return count;
  }
}

describe("ProjectDeliverableService", () => {
  const workspaceId = "w0000000-0000-0000-0000-000000000001";
  const projectId = "p0000000-0000-0000-0000-000000000001";
  const clientId = "c0000000-0000-0000-0000-000000000001";
  const ownerUserId = "u0000000-0000-0000-0000-000000000001";
  const viewerUserId = "u0000000-0000-0000-0000-000000000002";

  let deliverableRepo: FakeDeliverableRepository;
  let mockProjectRepo: any;
  let mockMemberRepo: any;
  let mockInvoiceService: any;
  let service: ProjectDeliverableService;

  const mockProject: Project = {
    id: projectId,
    workspaceId,
    clientId,
    name: "FinTech Platform",
    slug: "fintech-platform",
    description: "FinTech backend platform",
    status: "active",
    pricingModel: "fixed",
    budgetCurrency: "USD",
    budgetAmount: "5000.00",
    startDate: "2026-09-01",
    targetDate: "2026-10-01",
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: ownerUserId,
    updatedBy: ownerUserId,
    deletedAt: null,
  };

  beforeEach(() => {
    deliverableRepo = new FakeDeliverableRepository();
    mockProjectRepo = {
      getById: vi.fn().mockImplementation(async (pId: string, wId: string) => {
        if (pId === projectId && wId === workspaceId) return mockProject;
        return null;
      }),
    };
    mockMemberRepo = {
      getByWorkspaceAndUser: vi
        .fn()
        .mockImplementation(async (wId: string, uId: string) => {
          if (wId !== workspaceId) return null;
          if (uId === ownerUserId) {
            return {
              id: "mem-owner",
              workspaceId,
              userId: ownerUserId,
              role: "owner",
            } as WorkspaceMember;
          }
          if (uId === viewerUserId) {
            return {
              id: "mem-viewer",
              workspaceId,
              userId: viewerUserId,
              role: "viewer",
            } as WorkspaceMember;
          }
          return null;
        }),
    };
    mockInvoiceService = {
      createInvoice: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "inv-progress-1",
          invoiceNumber: "INV-2026-0002",
          totalAmount: "2500.00",
          subtotal: "2500.00",
          status: "draft",
        },
      }),
      deleteInvoice: vi.fn().mockResolvedValue({ success: true, data: true }),
    };

    service = new ProjectDeliverableService(
      deliverableRepo as any,
      mockProjectRepo,
      mockMemberRepo,
      mockInvoiceService,
      null,
    );
  });

  describe("Progress calculation", () => {
    it("computes deterministic metrics with 0 deliverables", () => {
      const progress = service.calculateProgress([]);
      expect(progress.totalCount).toBe(0);
      expect(progress.completedCount).toBe(0);
      expect(progress.completionPercentage).toBe(0);
      expect(progress.totalEstimatedHours).toBe(0);
      expect(progress.totalLoggedHours).toBe(0);
      expect(progress.remainingHours).toBe(0);
    });

    it("computes completion percentage and hour balances correctly", () => {
      const deliverables: ProjectDeliverable[] = [
        {
          id: "d1",
          workspaceId,
          projectId,
          title: "Auth Module",
          description: null,
          estimatedHours: "10.00",
          loggedHours: "10.00",
          complexity: "medium",
          status: "completed",
          position: 1,
          sourceScopeId: null,
          invoiceId: null,
          billedAt: null,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "d2",
          workspaceId,
          projectId,
          title: "Database Architecture",
          description: null,
          estimatedHours: "8.00",
          loggedHours: "4.00",
          complexity: "high",
          status: "in_progress",
          position: 2,
          sourceScopeId: null,
          invoiceId: null,
          billedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "d3",
          workspaceId,
          projectId,
          title: "Payment Gateway",
          description: null,
          estimatedHours: "12.00",
          loggedHours: "0.00",
          complexity: "high",
          status: "pending",
          position: 3,
          sourceScopeId: null,
          invoiceId: null,
          billedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const progress = service.calculateProgress(deliverables);
      expect(progress.totalCount).toBe(3);
      expect(progress.completedCount).toBe(1);
      expect(progress.inProgressCount).toBe(1);
      expect(progress.pendingCount).toBe(1);
      // 1 / 3 = 33%
      expect(progress.completionPercentage).toBe(33);
      expect(progress.totalEstimatedHours).toBe(30);
      expect(progress.totalLoggedHours).toBe(14);
      expect(progress.remainingHours).toBe(16);
    });

    it("allows hours overruns and clamps remainingHours to 0", () => {
      const deliverables: ProjectDeliverable[] = [
        {
          id: "d1",
          workspaceId,
          projectId,
          title: "Complex Refactoring",
          description: null,
          estimatedHours: "10.00",
          loggedHours: "15.50",
          complexity: "high",
          status: "in_progress",
          position: 1,
          sourceScopeId: null,
          invoiceId: null,
          billedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const progress = service.calculateProgress(deliverables);
      expect(progress.totalEstimatedHours).toBe(10);
      expect(progress.totalLoggedHours).toBe(15.5);
      expect(progress.remainingHours).toBe(0);
    });
  });

  describe("CRUD operations & RBAC", () => {
    it("allows owner to create a deliverable", async () => {
      const result = await service.createDeliverable(
        projectId,
        workspaceId,
        ownerUserId,
        {
          title: "Implement API Rate Limiting",
          estimatedHours: "6.00",
          complexity: "medium",
        },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Implement API Rate Limiting");
        expect(result.data.status).toBe("pending");
        expect(result.data.estimatedHours).toBe("6.00");
      }
    });

    it("rejects deliverable creation by viewer with 403", async () => {
      const result = await service.createDeliverable(
        projectId,
        workspaceId,
        viewerUserId,
        {
          title: "Unauthorized Task",
          estimatedHours: "4.00",
        },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(
          ProjectDeliverablePermissionDeniedError,
        );
      }
    });

    it("updates status and sets completedAt when marked completed", async () => {
      const created = await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "Test Task",
        status: "pending",
        estimatedHours: "5.00",
        loggedHours: "0.00",
        complexity: "low",
        position: 1,
      });

      const updatedRes = await service.updateDeliverable(
        created.id,
        projectId,
        workspaceId,
        ownerUserId,
        {
          status: "completed",
        },
      );

      expect(updatedRes.success).toBe(true);
      if (updatedRes.success) {
        expect(updatedRes.data.status).toBe("completed");
        expect(updatedRes.data.completedAt).not.toBeNull();
      }
    });

    it("clears completedAt when deliverable is reopened", async () => {
      const completed = await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "Completed Task",
        status: "completed",
        completedAt: new Date(),
        estimatedHours: "5.00",
        loggedHours: "5.00",
        complexity: "low",
        position: 1,
      });

      const reopenedRes = await service.updateDeliverable(
        completed.id,
        projectId,
        workspaceId,
        ownerUserId,
        {
          status: "in_progress",
        },
      );

      expect(reopenedRes.success).toBe(true);
      if (reopenedRes.success) {
        expect(reopenedRes.data.status).toBe("in_progress");
        expect(reopenedRes.data.completedAt).toBeNull();
      }
    });

    it("rejects negative hours with validation error", async () => {
      const created = await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "Test Task",
        status: "pending",
        estimatedHours: "5.00",
        loggedHours: "0.00",
        complexity: "low",
        position: 1,
      });

      const invalidEst = await service.updateDeliverable(
        created.id,
        projectId,
        workspaceId,
        ownerUserId,
        {
          estimatedHours: "-5",
        },
      );
      expect(invalidEst.success).toBe(false);

      const invalidLog = await service.updateDeliverable(
        created.id,
        projectId,
        workspaceId,
        ownerUserId,
        {
          loggedHours: "-1",
        },
      );
      expect(invalidLog.success).toBe(false);
    });
  });

  describe("Progress Invoicing (Itemized Completed-Deliverable Billing)", () => {
    it("creates progress invoice for completed deliverables and marks them billed", async () => {
      const d1 = await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "Milestone 1: Auth Module",
        status: "completed",
        completedAt: new Date(),
        estimatedHours: "20.00",
        loggedHours: "20.00",
        complexity: "high",
        position: 1,
      });

      const invoiceRes = await service.createProgressInvoice(
        projectId,
        workspaceId,
        ownerUserId,
        {
          deliverableIds: [d1.id],
          dueDate: "2026-10-15",
          taxRate: "18.00",
          discountRate: "0.00",
        },
      );

      expect(invoiceRes.success).toBe(true);
      if (invoiceRes.success) {
        expect(invoiceRes.data.invoice.id).toBe("inv-progress-1");
        expect(invoiceRes.data.billedDeliverables.length).toBe(1);
        expect(invoiceRes.data.billedDeliverables[0].billedAt).not.toBeNull();
        expect(invoiceRes.data.billedDeliverables[0].invoiceId).toBe(
          "inv-progress-1",
        );
      }
    });

    it("rejects progress invoicing if deliverable is not completed", async () => {
      const d1 = await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "In-Progress Task",
        status: "in_progress",
        estimatedHours: "10.00",
        loggedHours: "5.00",
        complexity: "medium",
        position: 1,
      });

      const invoiceRes = await service.createProgressInvoice(
        projectId,
        workspaceId,
        ownerUserId,
        {
          deliverableIds: [d1.id],
        },
      );

      expect(invoiceRes.success).toBe(false);
      if (!invoiceRes.success) {
        expect(invoiceRes.error.message).toContain("must be marked completed");
      }
    });

    it("rejects progress invoicing if deliverable has already been billed", async () => {
      const d1 = await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "Already Billed Task",
        status: "completed",
        completedAt: new Date(),
        billedAt: new Date(),
        invoiceId: "inv-old",
        estimatedHours: "10.00",
        loggedHours: "10.00",
        complexity: "medium",
        position: 1,
      });

      const invoiceRes = await service.createProgressInvoice(
        projectId,
        workspaceId,
        ownerUserId,
        {
          deliverableIds: [d1.id],
        },
      );

      expect(invoiceRes.success).toBe(false);
      if (!invoiceRes.success) {
        expect(invoiceRes.error.code).toBe("DELIVERABLE_ALREADY_BILLED");
      }
    });

    it("concurrency race: handles two simultaneous calls to bill same deliverable safely", async () => {
      const d1 = await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "Contested Milestone",
        status: "completed",
        completedAt: new Date(),
        estimatedHours: "15.00",
        loggedHours: "15.00",
        complexity: "medium",
        position: 1,
      });

      // Simulate simultaneous requests
      const [res1, res2] = await Promise.all([
        service.createProgressInvoice(projectId, workspaceId, ownerUserId, {
          deliverableIds: [d1.id],
        }),
        service.createProgressInvoice(projectId, workspaceId, ownerUserId, {
          deliverableIds: [d1.id],
        }),
      ]);

      // Exactly one must succeed, and one must fail with conflict/already billed
      const successes = [res1, res2].filter((r) => r.success);
      const failures = [res1, res2].filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error.code).toBe("DELIVERABLE_ALREADY_BILLED");
    });
  });
});
