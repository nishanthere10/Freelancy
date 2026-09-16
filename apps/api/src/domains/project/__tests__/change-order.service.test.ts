import type {
  ChangeOrder,
  Project,
  ProjectDeliverable,
  WorkspaceMember,
} from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InvoiceService } from "../../invoice/invoice.service";
import type { WorkspaceMemberRepository } from "../../workspace/repository";
import { ChangeOrderService } from "../change-order.service";
import type { IProjectEventEmitter } from "../project.events";
import type { ChangeOrderRepository } from "../repository/change-order.repository";
import type { ProjectDeliverableRepository } from "../repository/project-deliverable.repository";
import type { ProjectRepository } from "../repository/project.repository";

class FakeChangeOrderRepository implements Partial<ChangeOrderRepository> {
  public changeOrders: Map<string, ChangeOrder> = new Map();
  private nextId = 1;

  async create(data: any): Promise<ChangeOrder> {
    const id = `co-${this.nextId++}`;
    const now = new Date();
    const record: ChangeOrder = {
      id,
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      scopeAnalysisId: data.scopeAnalysisId,
      driftAnalysisId: data.driftAnalysisId || null,
      invoiceId: data.invoiceId || null,
      changeOrderNumber: data.changeOrderNumber,
      title: data.title,
      description: data.description || null,
      status: data.status || "draft",
      additionalBudget: data.additionalBudget || "0.00",
      additionalHours: data.additionalHours || "0.00",
      timelineDeltaDays: data.timelineDeltaDays || 0,
      proposedDeliverables: data.proposedDeliverables || [],
      approvedByUserId: data.approvedByUserId || null,
      approvedAt: data.approvedAt || null,
      createdAt: now,
      updatedAt: now,
    };
    this.changeOrders.set(id, record);
    return record;
  }

  async getById(
    id: string,
    projectId: string,
    workspaceId: string,
  ): Promise<ChangeOrder | null> {
    const co = this.changeOrders.get(id);
    if (!co || co.projectId !== projectId || co.workspaceId !== workspaceId) {
      return null;
    }
    return co;
  }

  async listByProject(
    projectId: string,
    workspaceId: string,
  ): Promise<ChangeOrder[]> {
    return Array.from(this.changeOrders.values()).filter(
      (co) => co.projectId === projectId && co.workspaceId === workspaceId,
    );
  }

  async getNextChangeOrderNumber(
    projectId: string,
    workspaceId: string,
  ): Promise<string> {
    const count = (await this.listByProject(projectId, workspaceId)).length;
    return `CO-${String(count + 1).padStart(3, "0")}`;
  }

  async updateDraft(
    id: string,
    projectId: string,
    workspaceId: string,
    data: any,
  ): Promise<ChangeOrder | null> {
    const co = await this.getById(id, projectId, workspaceId);
    if (!co || co.status !== "draft") return null;
    const updated = { ...co, ...data, updatedAt: new Date() };
    this.changeOrders.set(id, updated);
    return updated;
  }

  async atomicClaimApproved(
    id: string,
    projectId: string,
    workspaceId: string,
    actorUserId: string,
  ): Promise<ChangeOrder | null> {
    const co = await this.getById(id, projectId, workspaceId);
    if (!co || co.status !== "draft") return null;
    const claimed = {
      ...co,
      status: "approved" as const,
      approvedByUserId: actorUserId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };
    this.changeOrders.set(id, claimed);
    return claimed;
  }

  async revertStatus(
    id: string,
    projectId: string,
    workspaceId: string,
    status: "draft" | "cancelled" | "rejected",
  ): Promise<ChangeOrder> {
    const co = await this.getById(id, projectId, workspaceId);
    if (!co) throw new Error("Not found");
    const reverted = {
      ...co,
      status,
      approvedByUserId: null,
      approvedAt: null,
      updatedAt: new Date(),
    };
    this.changeOrders.set(id, reverted);
    return reverted;
  }

  async updateStatus(
    id: string,
    projectId: string,
    workspaceId: string,
    status: "rejected" | "cancelled",
  ): Promise<ChangeOrder | null> {
    const co = await this.getById(id, projectId, workspaceId);
    if (!co || co.status !== "draft") return null;
    const updated = { ...co, status, updatedAt: new Date() };
    this.changeOrders.set(id, updated);
    return updated;
  }

  async linkInvoice(
    id: string,
    projectId: string,
    workspaceId: string,
    invoiceId: string,
  ): Promise<ChangeOrder> {
    const co = await this.getById(id, projectId, workspaceId);
    if (!co) throw new Error("Not found");
    const updated = { ...co, invoiceId, updatedAt: new Date() };
    this.changeOrders.set(id, updated);
    return updated;
  }
}

class FakeDeliverableRepository
  implements Partial<ProjectDeliverableRepository>
{
  public deliverables: Map<string, ProjectDeliverable> = new Map();
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
      changeOrderId: data.changeOrderId || null,
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

  async getMaxPosition(
    projectId: string,
    workspaceId: string,
  ): Promise<number> {
    const items = Array.from(this.deliverables.values()).filter(
      (d) => d.projectId === projectId && d.workspaceId === workspaceId,
    );
    if (items.length === 0) return 0;
    return Math.max(...items.map((d) => d.position));
  }

  async deleteByChangeOrderId(
    changeOrderId: string,
    projectId: string,
    workspaceId: string,
  ): Promise<number> {
    let deleted = 0;
    for (const [id, d] of this.deliverables.entries()) {
      if (
        d.changeOrderId === changeOrderId &&
        d.projectId === projectId &&
        d.workspaceId === workspaceId
      ) {
        this.deliverables.delete(id);
        deleted++;
      }
    }
    return deleted;
  }
}

class FakeProjectRepository implements Partial<ProjectRepository> {
  public projects: Map<string, Project> = new Map();

  async getById(id: string, workspaceId: string): Promise<Project | null> {
    const p = this.projects.get(id);
    if (!p || p.workspaceId !== workspaceId) return null;
    return p;
  }

  async update(id: string, workspaceId: string, data: any): Promise<Project> {
    const p = await this.getById(id, workspaceId);
    if (!p) throw new Error("Project not found");
    const updated: Project = {
      ...p,
      budgetAmount:
        data.budgetAmount !== undefined
          ? data.budgetAmount !== null
            ? Number(data.budgetAmount).toFixed(2)
            : null
          : p.budgetAmount,
      targetDate:
        data.targetDate !== undefined ? data.targetDate : p.targetDate,
      updatedAt: new Date(),
    };
    this.projects.set(id, updated);
    return updated;
  }
}

class FakeMemberRepository implements Partial<WorkspaceMemberRepository> {
  public members: Map<string, WorkspaceMember> = new Map();

  async getByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.members.get(`${workspaceId}:${userId}`) || null;
  }
}

describe("ChangeOrderService", () => {
  const workspaceId = "ws-123";
  const projectId = "proj-456";
  const clientId = "client-789";
  const actorId = "user-111";
  const scopeAnalysisId = "scope-999";

  let changeOrderRepo: FakeChangeOrderRepository;
  let deliverableRepo: FakeDeliverableRepository;
  let projectRepo: FakeProjectRepository;
  let memberRepo: FakeMemberRepository;
  let fakeInvoiceService: Partial<InvoiceService>;
  let fakeEventEmitter: IProjectEventEmitter;
  let emittedEvents: any[];
  let service: ChangeOrderService;

  beforeEach(() => {
    changeOrderRepo = new FakeChangeOrderRepository();
    deliverableRepo = new FakeDeliverableRepository();
    projectRepo = new FakeProjectRepository();
    memberRepo = new FakeMemberRepository();
    emittedEvents = [];

    fakeEventEmitter = {
      emit: async (event) => {
        emittedEvents.push(event);
      },
    };

    fakeInvoiceService = {
      createInvoice: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "inv-co-001",
          invoiceNumber: "INV-2026-0001-CO1",
          totalAmount: "12000.00",
          status: "draft",
        },
      }),
    };

    // Standard active project
    const activeProject: Project = {
      id: projectId,
      workspaceId,
      clientId,
      name: "E-Commerce Project",
      slug: "e-commerce",
      description: "Test project",
      status: "active",
      pricingModel: "fixed",
      budgetCurrency: "INR",
      budgetAmount: "100000.00",
      startDate: "2026-09-01",
      targetDate: "2026-09-30",
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    };
    projectRepo.projects.set(projectId, activeProject);

    // Standard workspace membership
    const member: WorkspaceMember = {
      id: "mem-1",
      workspaceId,
      userId: actorId,
      role: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    memberRepo.members.set(`${workspaceId}:${actorId}`, member);

    service = new ChangeOrderService(
      changeOrderRepo as any,
      deliverableRepo as any,
      projectRepo as any,
      memberRepo as any,
      fakeInvoiceService as any,
      null,
      fakeEventEmitter,
    );
  });

  describe("Preconditions", () => {
    it("rejects non-workspace members", async () => {
      const res = await service.createDraft(
        projectId,
        workspaceId,
        "stranger",
        {
          scopeAnalysisId,
          title: "Test",
          additionalBudget: "5000.00",
          additionalHours: "5.00",
          proposedDeliverables: [{ title: "Item 1", estimatedHours: 5 }],
        },
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe("PERMISSION_DENIED");
      }
    });

    it("rejects viewers from creating change orders", async () => {
      memberRepo.members.set(`${workspaceId}:viewer-user`, {
        id: "mem-2",
        workspaceId,
        userId: "viewer-user",
        role: "viewer",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const res = await service.createDraft(
        projectId,
        workspaceId,
        "viewer-user",
        {
          scopeAnalysisId,
          title: "Test",
          additionalBudget: "5000.00",
          additionalHours: "5.00",
          proposedDeliverables: [{ title: "Item 1", estimatedHours: 5 }],
        },
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe("PERMISSION_DENIED");
      }
    });

    it("rejects creating change orders for inactive projects", async () => {
      const baseProject = projectRepo.projects.get(projectId);
      if (!baseProject) throw new Error("Project not found in test");
      const draftProject = {
        ...baseProject,
        status: "draft" as const,
      };
      projectRepo.projects.set(projectId, draftProject);

      const res = await service.createDraft(projectId, workspaceId, actorId, {
        scopeAnalysisId,
        title: "Test",
        additionalBudget: "5000.00",
        additionalHours: "5.00",
        proposedDeliverables: [{ title: "Item 1", estimatedHours: 5 }],
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe("INVALID_PROJECT_STATE");
      }
    });

    it("rejects approving a change order if project has no client assigned", async () => {
      const draftRes = await service.createDraft(
        projectId,
        workspaceId,
        actorId,
        {
          scopeAnalysisId,
          title: "WhatsApp Alerts",
          additionalBudget: "12000.00",
          additionalHours: "8.00",
          proposedDeliverables: [
            { title: "WhatsApp Integration", estimatedHours: 8 },
          ],
        },
      );
      expect(draftRes.success).toBe(true);
      if (!draftRes.success) return;

      // Unassign client
      const baseProject = projectRepo.projects.get(projectId);
      if (!baseProject) throw new Error("Project not found in test");
      const noClientProj = {
        ...baseProject,
        clientId: null,
      };
      projectRepo.projects.set(projectId, noClientProj);

      const appRes = await service.approveChangeOrder(
        draftRes.data.id,
        projectId,
        workspaceId,
        actorId,
      );

      expect(appRes.success).toBe(false);
      if (!appRes.success) {
        expect(appRes.error.code).toBe("INVALID_PROJECT_STATE");
        expect(appRes.error.message).toContain("no assigned client");
      }
    });
  });

  describe("Draft Creation & Updates", () => {
    it("creates a draft with sequential numbering and emits event", async () => {
      const res1 = await service.createDraft(projectId, workspaceId, actorId, {
        scopeAnalysisId,
        title: "First Change",
        additionalBudget: "10000.00",
        additionalHours: "10.00",
        timelineDeltaDays: 2,
        proposedDeliverables: [{ title: "Extra Feature", estimatedHours: 10 }],
      });

      expect(res1.success).toBe(true);
      if (!res1.success) return;
      expect(res1.data.changeOrderNumber).toBe("CO-001");
      expect(res1.data.status).toBe("draft");

      const res2 = await service.createDraft(projectId, workspaceId, actorId, {
        scopeAnalysisId,
        title: "Second Change",
        additionalBudget: "5000.00",
        additionalHours: "5.00",
        timelineDeltaDays: 1,
        proposedDeliverables: [{ title: "Extra UI", estimatedHours: 5 }],
      });

      expect(res2.success).toBe(true);
      if (!res2.success) return;
      expect(res2.data.changeOrderNumber).toBe("CO-002");

      expect(
        emittedEvents.some((e) => e.type === "project.change_order.created"),
      ).toBe(true);
    });

    it("updates draft change order before approval", async () => {
      const draftRes = await service.createDraft(
        projectId,
        workspaceId,
        actorId,
        {
          scopeAnalysisId,
          title: "Draft Title",
          additionalBudget: "5000.00",
          additionalHours: "5.00",
          proposedDeliverables: [{ title: "Initial item", estimatedHours: 5 }],
        },
      );
      expect(draftRes.success).toBe(true);
      if (!draftRes.success) return;

      const updateRes = await service.updateDraft(
        draftRes.data.id,
        projectId,
        workspaceId,
        actorId,
        {
          title: "Updated Title",
          additionalBudget: "8000.00",
        },
      );

      expect(updateRes.success).toBe(true);
      if (!updateRes.success) return;
      expect(updateRes.data.title).toBe("Updated Title");
      expect(updateRes.data.additionalBudget).toBe("8000.00");
    });
  });

  describe("Approval Workflow & Continuous Positioning Invariant", () => {
    it("materializes deliverables with continuous position and updates project financials", async () => {
      // Seed 3 existing deliverables with position 1, 2, 3
      await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "Homepage",
        position: 1,
      });
      await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "Catalog",
        position: 2,
      });
      await deliverableRepo.create({
        workspaceId,
        projectId,
        title: "Cart",
        position: 3,
      });

      const draftRes = await service.createDraft(
        projectId,
        workspaceId,
        actorId,
        {
          scopeAnalysisId,
          title: "WhatsApp Integration",
          additionalBudget: "12000.00",
          additionalHours: "8.00",
          timelineDeltaDays: 2,
          proposedDeliverables: [
            { title: "Notification Service", estimatedHours: 5 },
            { title: "Notification QA", estimatedHours: 3 },
          ],
        },
      );
      expect(draftRes.success).toBe(true);
      if (!draftRes.success) return;

      const approveRes = await service.approveChangeOrder(
        draftRes.data.id,
        projectId,
        workspaceId,
        actorId,
      );

      expect(approveRes.success).toBe(true);
      if (!approveRes.success) return;

      // Verify deliverables materialized with continuous position: 4 and 5!
      const allDeliverables = Array.from(deliverableRepo.deliverables.values());
      expect(allDeliverables.length).toBe(5);

      const newDeliv1 = allDeliverables.find(
        (d) => d.title === "Notification Service",
      );
      const newDeliv2 = allDeliverables.find(
        (d) => d.title === "Notification QA",
      );
      expect(newDeliv1?.position).toBe(4);
      expect(newDeliv2?.position).toBe(5);
      expect(newDeliv1?.changeOrderId).toBe(draftRes.data.id);

      // Verify project budget updated: 100,000 + 12,000 = 112,000
      const updatedProj = projectRepo.projects.get(projectId);
      expect(updatedProj?.budgetAmount).toBe("112000.00");

      // Verify target date shifted by +2 days from 2026-09-30 -> 2026-10-02
      expect(updatedProj?.targetDate).toBe("2026-10-02");

      // Verify change order linked to invoice
      expect(approveRes.data.invoiceCreated?.id).toBe("inv-co-001");
      expect(fakeInvoiceService.createInvoice).toHaveBeenCalled();

      // Verify approved activity event emitted
      expect(
        emittedEvents.some(
          (e) =>
            e.type === "project.change_order.approved" &&
            e.changeOrderId === draftRes.data.id,
        ),
      ).toBe(true);
    });

    it("enforces idempotency: cannot approve the same change order twice", async () => {
      const draftRes = await service.createDraft(
        projectId,
        workspaceId,
        actorId,
        {
          scopeAnalysisId,
          title: "Idempotency Test",
          additionalBudget: "5000.00",
          additionalHours: "5.00",
          proposedDeliverables: [{ title: "Feature", estimatedHours: 5 }],
        },
      );
      expect(draftRes.success).toBe(true);
      if (!draftRes.success) return;

      const firstApproval = await service.approveChangeOrder(
        draftRes.data.id,
        projectId,
        workspaceId,
        actorId,
      );
      expect(firstApproval.success).toBe(true);

      const secondApproval = await service.approveChangeOrder(
        draftRes.data.id,
        projectId,
        workspaceId,
        actorId,
      );
      expect(secondApproval.success).toBe(false);
      if (!secondApproval.success) {
        expect(secondApproval.error.statusCode).toBe(409);
      }
    });
  });

  describe("Compensating Saga Rollback on Invoice Failure", () => {
    it("rolls back materialized deliverables, budget, and reverts change order status to draft if invoice creation fails", async () => {
      // Mock invoice service to simulate a failure
      fakeInvoiceService.createInvoice = vi.fn().mockResolvedValue({
        success: false,
        error: new Error("Simulated payment gateway / invoice service timeout"),
      });

      const draftRes = await service.createDraft(
        projectId,
        workspaceId,
        actorId,
        {
          scopeAnalysisId,
          title: "Failure Path Test",
          additionalBudget: "15000.00",
          additionalHours: "10.00",
          timelineDeltaDays: 3,
          proposedDeliverables: [
            { title: "Fragile Feature A", estimatedHours: 6 },
            { title: "Fragile Feature B", estimatedHours: 4 },
          ],
        },
      );
      expect(draftRes.success).toBe(true);
      if (!draftRes.success) return;

      const approveRes = await service.approveChangeOrder(
        draftRes.data.id,
        projectId,
        workspaceId,
        actorId,
      );

      // Approval MUST fail
      expect(approveRes.success).toBe(false);
      if (!approveRes.success) {
        expect(approveRes.error.code).toBe("INVOICE_CREATION_FAILED");
        expect(approveRes.error.statusCode).toBe(422);
      }

      // Invariant: Zero orphaned deliverables left behind
      const deliverables = Array.from(deliverableRepo.deliverables.values());
      expect(deliverables.length).toBe(0);

      // Invariant: Project budget and target date restored
      const project = projectRepo.projects.get(projectId);
      expect(project?.budgetAmount).toBe("100000.00");
      expect(project?.targetDate).toBe("2026-09-30");

      // Invariant: Change order reverted to 'draft'
      const changeOrder = changeOrderRepo.changeOrders.get(draftRes.data.id);
      expect(changeOrder?.status).toBe("draft");
      expect(changeOrder?.approvedAt).toBeNull();
    });
  });

  describe("Rejection & Cancellation", () => {
    it("rejects a change order without altering project state", async () => {
      const draftRes = await service.createDraft(
        projectId,
        workspaceId,
        actorId,
        {
          scopeAnalysisId,
          title: "Out-of-scope idea",
          additionalBudget: "20000.00",
          additionalHours: "15.00",
          proposedDeliverables: [
            { title: "Too expensive", estimatedHours: 15 },
          ],
        },
      );
      expect(draftRes.success).toBe(true);
      if (!draftRes.success) return;

      const rejectRes = await service.rejectChangeOrder(
        draftRes.data.id,
        projectId,
        workspaceId,
        actorId,
      );

      expect(rejectRes.success).toBe(true);
      if (!rejectRes.success) return;
      expect(rejectRes.data.status).toBe("rejected");

      // Project remains untouched
      const project = projectRepo.projects.get(projectId);
      expect(project?.budgetAmount).toBe("100000.00");
      expect(deliverableRepo.deliverables.size).toBe(0);
      expect(
        emittedEvents.some((e) => e.type === "project.change_order.rejected"),
      ).toBe(true);
    });

    it("cancels a change order without altering project state", async () => {
      const draftRes = await service.createDraft(
        projectId,
        workspaceId,
        actorId,
        {
          scopeAnalysisId,
          title: "Cancelled idea",
          additionalBudget: "5000.00",
          additionalHours: "5.00",
          proposedDeliverables: [{ title: "Cancelled", estimatedHours: 5 }],
        },
      );
      expect(draftRes.success).toBe(true);
      if (!draftRes.success) return;

      const cancelRes = await service.cancelChangeOrder(
        draftRes.data.id,
        projectId,
        workspaceId,
        actorId,
      );

      expect(cancelRes.success).toBe(true);
      if (!cancelRes.success) return;
      expect(cancelRes.data.status).toBe("cancelled");

      expect(
        emittedEvents.some((e) => e.type === "project.change_order.cancelled"),
      ).toBe(true);
    });
  });
});
