import type {
  Client,
  Project,
  WorkspaceMember,
  WorkspaceRole,
} from "@repo/database";

export class FakeWorkspaceMemberRepository {
  private members: Map<string, WorkspaceMember> = new Map();

  setMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole = "owner",
  ) {
    const key = `${workspaceId}:${userId}`;
    this.members.set(key, {
      id: `member-${userId}`,
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
    const key = `${workspaceId}:${userId}`;
    return this.members.get(key) || null;
  }
}

export class FakeClientRepository {
  private clients: Map<string, Client> = new Map();
  private nextId = 1;

  async create(data: any): Promise<Client> {
    const id = `c0000000-0000-0000-0000-${String(this.nextId++).padStart(12, "0")}`;
    const now = new Date();
    const client: Client = {
      id,
      workspaceId: data.workspaceId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      website: data.website || null,
      companyName: data.companyName || null,
      gstNumber: data.gstNumber || null,
      contactPerson: data.contactPerson || null,
      department: data.department || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || "IN",
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy || data.createdBy,
      deletedAt: null,
    };
    this.clients.set(id, client);
    return client;
  }

  async getById(
    id: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Client | null> {
    const client = this.clients.get(id);
    if (!client || client.workspaceId !== workspaceId) return null;
    if (!options?.includeDeleted && client.deletedAt) return null;
    return client;
  }

  async getByEmail(email: string, workspaceId: string): Promise<Client | null> {
    const client = Array.from(this.clients.values()).find(
      (c) =>
        c.workspaceId === workspaceId &&
        c.email.toLowerCase() === email.toLowerCase() &&
        !c.deletedAt,
    );
    return client || null;
  }

  async update(id: string, workspaceId: string, data: any): Promise<Client> {
    const client = await this.getById(id, workspaceId);
    if (!client) throw new Error("Client not found");
    const updated = { ...client, ...data, updatedAt: new Date() };
    this.clients.set(id, updated);
    return updated;
  }

  async softDelete(
    id: string,
    workspaceId: string,
    deletedBy: string,
  ): Promise<Client> {
    const client = await this.getById(id, workspaceId);
    if (!client) throw new Error("Client not found");
    const deleted = {
      ...client,
      deletedAt: new Date(),
      updatedBy: deletedBy,
      updatedAt: new Date(),
    };
    this.clients.set(id, deleted);
    return deleted;
  }
}

export class FakeProjectRepository {
  private projects: Map<string, Project> = new Map();
  private nextId = 1;

  async create(data: any): Promise<Project> {
    const id = `p0000000-0000-0000-0000-${String(this.nextId++).padStart(12, "0")}`;
    const now = new Date();
    const project: Project = {
      id,
      workspaceId: data.workspaceId,
      clientId: data.clientId || null,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      pricingModel: "fixed",
      status: "draft",
      budgetAmount: data.budgetAmount || null,
      budgetCurrency: data.budgetCurrency || "INR",
      startDate: null,
      targetDate: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy || data.createdBy,
      deletedAt: null,
    };
    this.projects.set(id, project);
    return project;
  }

  async getById(
    id: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Project | null> {
    const project = this.projects.get(id);
    if (!project || project.workspaceId !== workspaceId) return null;
    if (!options?.includeDeleted && project.deletedAt) return null;
    return project;
  }

  async getBySlug(slug: string, workspaceId: string): Promise<Project | null> {
    const project = Array.from(this.projects.values()).find(
      (p) => p.workspaceId === workspaceId && p.slug === slug && !p.deletedAt,
    );
    return project || null;
  }

  async update(id: string, workspaceId: string, data: any): Promise<Project> {
    const project = await this.getById(id, workspaceId);
    if (!project) throw new Error("Project not found");
    const updated = { ...project, ...data, updatedAt: new Date() };
    this.projects.set(id, updated);
    return updated;
  }
}
