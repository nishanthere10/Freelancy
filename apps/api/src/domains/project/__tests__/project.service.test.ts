import type {
  Client,
  Project,
  WorkspaceMember,
  WorkspaceRole,
} from "@repo/database";
import { beforeEach, describe, expect, it } from "vitest";
import type { ClientRepository } from "../../client/repository/client.repository";
import type { WorkspaceMemberRepository } from "../../workspace/repository";
import {
  ProjectClientWorkspaceMismatchError,
  ProjectDeletedError,
  ProjectNotDeletedError,
  ProjectNotFoundError,
  ProjectPermissionDeniedError,
  ProjectSlugAlreadyExistsError,
  ProjectValidationError,
} from "../project.errors";
import type { IProjectEventEmitter } from "../project.events";
import { ProjectService } from "../project.service";
import type {
  CreateProjectRepositoryInput,
  ProjectQueryFilters,
  UpdateProjectRepositoryInput,
} from "../project.types";
import type { ProjectRepository } from "../repository/project.repository";

class FakeProjectRepository implements Partial<ProjectRepository> {
  private projects: Map<string, Project> = new Map();
  private nextId = 1;

  async create(data: CreateProjectRepositoryInput): Promise<Project> {
    const existingSlug = Array.from(this.projects.values()).find(
      (p) =>
        p.workspaceId === data.workspaceId &&
        p.slug === data.slug &&
        !p.deletedAt,
    );
    if (existingSlug) {
      throw new Error(
        "A project with this slug already exists in this workspace",
      );
    }

    const id = `p0000000-0000-0000-0000-${String(this.nextId++).padStart(12, "0")}`;
    const now = new Date();
    const project: Project = {
      id,
      workspaceId: data.workspaceId,
      clientId: data.clientId || null,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      status: "draft",
      pricingModel: data.pricingModel || "fixed",
      budgetCurrency: data.budgetCurrency || "INR",
      budgetAmount:
        data.budgetAmount !== undefined && data.budgetAmount !== null
          ? String(data.budgetAmount)
          : null,
      startDate: data.startDate || null,
      targetDate: data.targetDate || null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      deletedAt: null,
    };
    this.projects.set(id, project);
    return project;
  }

  async getById(
    id: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<(Project & { clientName?: string | null }) | null> {
    const p = this.projects.get(id);
    if (!p || p.workspaceId !== workspaceId) return null;
    if (!options?.includeDeleted && p.deletedAt) return null;
    return p;
  }

  async getBySlug(
    slug: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Project | null> {
    const p = Array.from(this.projects.values()).find(
      (proj) =>
        proj.workspaceId === workspaceId &&
        proj.slug === slug &&
        (options?.includeDeleted || !proj.deletedAt),
    );
    return p || null;
  }

  async list(
    filters: ProjectQueryFilters,
  ): Promise<Array<Project & { clientName?: string | null }>> {
    return Array.from(this.projects.values()).filter((p) => {
      if (p.workspaceId !== filters.workspaceId) return false;
      if (filters.clientId && p.clientId !== filters.clientId) return false;
      if (filters.excludeDeleted !== false && p.deletedAt) return false;
      if (
        filters.status &&
        filters.status !== "all" &&
        p.status !== filters.status
      )
        return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(term) ||
          (p.description && p.description.toLowerCase().includes(term));
        if (!matches) return false;
      }
      return true;
    });
  }

  async update(
    id: string,
    workspaceId: string,
    data: UpdateProjectRepositoryInput,
  ): Promise<Project> {
    const p = await this.getById(id, workspaceId, { includeDeleted: true });
    if (!p || p.deletedAt) throw new Error("Project not found");
    const updated: Project = {
      ...p,
      ...data,
      budgetAmount:
        data.budgetAmount !== undefined
          ? data.budgetAmount !== null
            ? String(data.budgetAmount)
            : null
          : p.budgetAmount,
      updatedAt: new Date(),
      updatedBy: data.updatedBy,
    };
    this.projects.set(id, updated);
    return updated;
  }

  async softDelete(
    id: string,
    workspaceId: string,
    deletedBy: string,
  ): Promise<Project> {
    const p = await this.getById(id, workspaceId);
    if (!p) throw new Error("Project not found");
    const deleted: Project = {
      ...p,
      status: "archived",
      deletedAt: new Date(),
      updatedBy: deletedBy,
      updatedAt: new Date(),
    };
    this.projects.set(id, deleted);
    return deleted;
  }

  async restore(
    id: string,
    workspaceId: string,
    restoredBy: string,
  ): Promise<Project> {
    const p = await this.getById(id, workspaceId, { includeDeleted: true });
    if (!p || !p.deletedAt) throw new Error("Project not found or not deleted");
    const restored: Project = {
      ...p,
      status: "active",
      deletedAt: null,
      updatedBy: restoredBy,
      updatedAt: new Date(),
    };
    this.projects.set(id, restored);
    return restored;
  }
}

class FakeClientRepository implements Partial<ClientRepository> {
  private clients: Map<string, Client> = new Map();

  addClient(client: Client) {
    this.clients.set(client.id, client);
  }

  async getById(id: string, workspaceId: string): Promise<Client | null> {
    const c = this.clients.get(id);
    if (!c || c.workspaceId !== workspaceId) return null;
    return c;
  }
}

class FakeWorkspaceMemberRepository
  implements Partial<WorkspaceMemberRepository>
{
  private members: Map<string, WorkspaceMember> = new Map();

  addMember(workspaceId: string, userId: string, role: WorkspaceRole) {
    const key = `${workspaceId}:${userId}`;
    this.members.set(key, {
      id: key,
      workspaceId,
      userId,
      role,
      joinedAt: new Date(),
      invitedBy: null,
      leftAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  async getByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.members.get(`${workspaceId}:${userId}`) || null;
  }
}

class FakeEventEmitter implements IProjectEventEmitter {
  events: any[] = [];
  async emit(event: any): Promise<void> {
    this.events.push(event);
  }
}

describe("ProjectService", () => {
  let projectRepo: FakeProjectRepository;
  let clientRepo: FakeClientRepository;
  let memberRepo: FakeWorkspaceMemberRepository;
  let eventEmitter: FakeEventEmitter;
  let service: ProjectService;

  const workspaceId1 = "w1111111-1111-1111-1111-111111111111";
  const workspaceId2 = "w2222222-2222-2222-2222-222222222222";
  const ownerId = "u1111111-1111-1111-1111-111111111111";
  const editorId = "u2222222-2222-2222-2222-222222222222";
  const viewerId = "u3333333-3333-3333-3333-333333333333";
  const nonMemberId = "u9999999-9999-9999-9999-999999999999";

  const validClientId = "c1111111-1111-1111-1111-111111111111";
  const otherWorkspaceClientId = "c2222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    projectRepo = new FakeProjectRepository();
    clientRepo = new FakeClientRepository();
    memberRepo = new FakeWorkspaceMemberRepository();
    eventEmitter = new FakeEventEmitter();

    memberRepo.addMember(workspaceId1, ownerId, "owner");
    memberRepo.addMember(workspaceId1, editorId, "editor");
    memberRepo.addMember(workspaceId1, viewerId, "viewer");

    clientRepo.addClient({
      id: validClientId,
      workspaceId: workspaceId1,
      name: "Client 1",
      email: "c1@test.com",
      phone: null,
      website: null,
      companyName: null,
      gstNumber: null,
      contactPerson: null,
      department: null,
      address: null,
      city: null,
      state: null,
      postalCode: null,
      country: "IN",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: ownerId,
      updatedBy: ownerId,
      deletedAt: null,
    });

    clientRepo.addClient({
      id: otherWorkspaceClientId,
      workspaceId: workspaceId2,
      name: "Client 2 (Workspace 2)",
      email: "c2@test.com",
      phone: null,
      website: null,
      companyName: null,
      gstNumber: null,
      contactPerson: null,
      department: null,
      address: null,
      city: null,
      state: null,
      postalCode: null,
      country: "IN",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: ownerId,
      updatedBy: ownerId,
      deletedAt: null,
    });

    service = new ProjectService(
      projectRepo as any,
      memberRepo as any,
      clientRepo as any,
      eventEmitter,
    );
  });

  describe("createProject", () => {
    it("creates project with valid client and owner/editor permissions", async () => {
      const res = await service.createProject(
        {
          name: "Mobile App V1",
          clientId: validClientId,
          pricingModel: "fixed",
          budgetAmount: 150000,
        },
        workspaceId1,
        editorId,
      );
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe("Mobile App V1");
        expect(res.data.clientId).toBe(validClientId);
        expect(res.data.status).toBe("draft");
      }
    });

    it("prevents creating project with client from another workspace", async () => {
      const res = await service.createProject(
        {
          name: "Rogue Project",
          clientId: otherWorkspaceClientId,
        },
        workspaceId1,
        editorId,
      );
      expect(res.success).toBe(false);
      expect(res.error).toBeInstanceOf(ProjectClientWorkspaceMismatchError);
      expect((res.error as ProjectClientWorkspaceMismatchError).code).toBe(
        "CLIENT_WORKSPACE_MISMATCH",
      );
    });

    it("prevents targetDate before startDate", async () => {
      const res = await service.createProject(
        {
          name: "Invalid Dates",
          startDate: "2026-10-01",
          targetDate: "2026-09-01",
        },
        workspaceId1,
        editorId,
      );
      expect(res.success).toBe(false);
      expect(res.error).toBeInstanceOf(ProjectValidationError);
    });

    it("denies viewer and non-member", async () => {
      const resViewer = await service.createProject(
        { name: "Test" },
        workspaceId1,
        viewerId,
      );
      expect(resViewer.success).toBe(false);
      expect(resViewer.error).toBeInstanceOf(ProjectPermissionDeniedError);

      const resNonMember = await service.createProject(
        { name: "Test" },
        workspaceId1,
        nonMemberId,
      );
      expect(resNonMember.success).toBe(false);
      expect(resNonMember.error).toBeInstanceOf(ProjectPermissionDeniedError);
    });
  });

  describe("status change & lifecycle", () => {
    it("handles draft -> active -> completed -> archived -> restore", async () => {
      const createRes = await service.createProject(
        { name: "Lifecycle Project" },
        workspaceId1,
        ownerId,
      );
      expect(createRes.success).toBe(true);
      if (!createRes.success) return;
      const projectId = createRes.data.id;

      // Status change to active
      const activeRes = await service.changeProjectStatus(
        projectId,
        workspaceId1,
        { status: "active" },
        editorId,
      );
      expect(activeRes.success).toBe(true);
      if (activeRes.success) expect(activeRes.data.status).toBe("active");

      // Status change to completed sets completedAt
      const completedRes = await service.changeProjectStatus(
        projectId,
        workspaceId1,
        { status: "completed" },
        editorId,
      );
      expect(completedRes.success).toBe(true);
      if (completedRes.success) {
        expect(completedRes.data.status).toBe("completed");
        expect(completedRes.data.completedAt).toBeInstanceOf(Date);
      }

      // Archive by owner
      const archiveRes = await service.deleteProject(
        projectId,
        workspaceId1,
        ownerId,
      );
      expect(archiveRes.success).toBe(true);
      if (archiveRes.success) expect(archiveRes.data.status).toBe("archived");

      // Restore by owner
      const restoreRes = await service.restoreProject(
        projectId,
        workspaceId1,
        ownerId,
      );
      expect(restoreRes.success).toBe(true);
      if (restoreRes.success) expect(restoreRes.data.status).toBe("active");
    });
  });
});
