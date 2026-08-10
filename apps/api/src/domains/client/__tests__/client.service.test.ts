import type { Client, WorkspaceMember, WorkspaceRole } from "@repo/database";
import { beforeEach, describe, expect, it } from "vitest";
import type { WorkspaceMemberRepository } from "../../workspace/repository";
import {
  ClientDeletedError,
  ClientEmailAlreadyExistsError,
  ClientNotDeletedError,
  ClientNotFoundError,
  ClientPermissionDeniedError,
} from "../client.errors";
import type { IClientEventEmitter } from "../client.events";
import { ClientService } from "../client.service";
import type {
  ClientQueryFilters,
  CreateClientRepositoryInput,
  UpdateClientRepositoryInput,
} from "../client.types";
import type { ClientRepository } from "../repository/client.repository";

class FakeClientRepository implements Partial<ClientRepository> {
  private clients: Map<string, Client> = new Map();
  private nextId = 1;

  async create(data: CreateClientRepositoryInput): Promise<Client> {
    const existing = Array.from(this.clients.values()).find(
      (c) =>
        c.workspaceId === data.workspaceId &&
        c.email.toLowerCase() === data.email.toLowerCase() &&
        !c.deletedAt,
    );
    if (existing) {
      throw new Error(
        "A client with this email already exists in this workspace",
      );
    }

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
      updatedBy: data.updatedBy,
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

  async getByEmail(
    email: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Client | null> {
    const client = Array.from(this.clients.values()).find(
      (c) =>
        c.workspaceId === workspaceId &&
        c.email.toLowerCase() === email.toLowerCase() &&
        (options?.includeDeleted || !c.deletedAt),
    );
    return client || null;
  }

  async list(filters: ClientQueryFilters): Promise<Client[]> {
    return Array.from(this.clients.values()).filter((c) => {
      if (c.workspaceId !== filters.workspaceId) return false;
      if (filters.excludeDeleted !== false && c.deletedAt) return false;
      if (
        filters.status &&
        filters.status !== "all" &&
        c.status !== filters.status
      )
        return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matches =
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          (c.companyName && c.companyName.toLowerCase().includes(term));
        if (!matches) return false;
      }
      return true;
    });
  }

  async update(
    id: string,
    workspaceId: string,
    data: UpdateClientRepositoryInput,
  ): Promise<Client> {
    const client = await this.getById(id, workspaceId, {
      includeDeleted: true,
    });
    if (!client || client.deletedAt) throw new Error("Client not found");
    const updated: Client = {
      ...client,
      ...data,
      updatedAt: new Date(),
      updatedBy: data.updatedBy,
    };
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
    const deleted: Client = {
      ...client,
      status: "archived",
      deletedAt: new Date(),
      updatedBy: deletedBy,
      updatedAt: new Date(),
    };
    this.clients.set(id, deleted);
    return deleted;
  }

  async restore(
    id: string,
    workspaceId: string,
    restoredBy: string,
  ): Promise<Client> {
    const client = await this.getById(id, workspaceId, {
      includeDeleted: true,
    });
    if (!client || !client.deletedAt)
      throw new Error("Client not found or not deleted");
    const restored: Client = {
      ...client,
      status: "active",
      deletedAt: null,
      updatedBy: restoredBy,
      updatedAt: new Date(),
    };
    this.clients.set(id, restored);
    return restored;
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

class FakeEventEmitter implements IClientEventEmitter {
  events: any[] = [];
  async emit(event: any): Promise<void> {
    this.events.push(event);
  }
}

describe("ClientService", () => {
  let clientRepo: FakeClientRepository;
  let memberRepo: FakeWorkspaceMemberRepository;
  let eventEmitter: FakeEventEmitter;
  let service: ClientService;

  const workspaceId = "w1111111-1111-1111-1111-111111111111";
  const ownerId = "u1111111-1111-1111-1111-111111111111";
  const editorId = "u2222222-2222-2222-2222-222222222222";
  const viewerId = "u3333333-3333-3333-3333-333333333333";
  const nonMemberId = "u9999999-9999-9999-9999-999999999999";

  beforeEach(() => {
    clientRepo = new FakeClientRepository();
    memberRepo = new FakeWorkspaceMemberRepository();
    eventEmitter = new FakeEventEmitter();

    memberRepo.addMember(workspaceId, ownerId, "owner");
    memberRepo.addMember(workspaceId, editorId, "editor");
    memberRepo.addMember(workspaceId, viewerId, "viewer");

    service = new ClientService(
      clientRepo as any,
      memberRepo as any,
      eventEmitter,
    );
  });

  describe("createClient", () => {
    it("allows owner and editor to create client", async () => {
      const res1 = await service.createClient(
        { name: "Acme", email: "acme@corp.com" },
        workspaceId,
        ownerId,
      );
      expect(res1.success).toBe(true);

      const res2 = await service.createClient(
        { name: "Beta", email: "beta@corp.com" },
        workspaceId,
        editorId,
      );
      expect(res2.success).toBe(true);
    });

    it("denies viewer and non-member", async () => {
      const res1 = await service.createClient(
        { name: "Acme", email: "acme@corp.com" },
        workspaceId,
        viewerId,
      );
      expect(res1.success).toBe(false);
      expect(res1.error).toBeInstanceOf(ClientPermissionDeniedError);

      const res2 = await service.createClient(
        { name: "Acme", email: "acme@corp.com" },
        workspaceId,
        nonMemberId,
      );
      expect(res2.success).toBe(false);
      expect(res2.error).toBeInstanceOf(ClientPermissionDeniedError);
    });

    it("rejects duplicate email in same workspace", async () => {
      await service.createClient(
        { name: "Acme", email: "acme@corp.com" },
        workspaceId,
        ownerId,
      );
      const res = await service.createClient(
        { name: "Acme Duplicate", email: "acme@corp.com" },
        workspaceId,
        ownerId,
      );
      expect(res.success).toBe(false);
      expect(res.error).toBeInstanceOf(ClientEmailAlreadyExistsError);
    });
  });

  describe("update & delete & restore lifecycle", () => {
    it("handles update, soft delete and restore", async () => {
      const createRes = await service.createClient(
        { name: "Acme", email: "acme@corp.com" },
        workspaceId,
        ownerId,
      );
      expect(createRes.success).toBe(true);
      if (!createRes.success) return;
      const clientId = createRes.data.id;

      // Update
      const updateRes = await service.updateClient(
        clientId,
        workspaceId,
        { name: "Acme Updated" },
        editorId,
      );
      expect(updateRes.success).toBe(true);
      if (updateRes.success) {
        expect(updateRes.data.name).toBe("Acme Updated");
      }

      // Viewer cannot delete
      const viewDelRes = await service.deleteClient(
        clientId,
        workspaceId,
        viewerId,
      );
      expect(viewDelRes.success).toBe(false);

      // Owner can delete
      const delRes = await service.deleteClient(clientId, workspaceId, ownerId);
      expect(delRes.success).toBe(true);

      // Updating deleted client fails
      const updateDelRes = await service.updateClient(
        clientId,
        workspaceId,
        { name: "Fail" },
        ownerId,
      );
      expect(updateDelRes.success).toBe(false);
      expect(updateDelRes.error).toBeInstanceOf(ClientDeletedError);

      // Restore
      const restoreRes = await service.restoreClient(
        clientId,
        workspaceId,
        ownerId,
      );
      expect(restoreRes.success).toBe(true);

      // Restoring active client fails
      const restoreActiveRes = await service.restoreClient(
        clientId,
        workspaceId,
        ownerId,
      );
      expect(restoreActiveRes.success).toBe(false);
      expect(restoreActiveRes.error).toBeInstanceOf(ClientNotDeletedError);
    });
  });
});
