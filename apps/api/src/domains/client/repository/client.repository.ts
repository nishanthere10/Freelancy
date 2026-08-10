import { type Client, clientsTable } from "@repo/database";
import { and, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "../../../db/client";
import type {
  ClientQueryFilters,
  CreateClientRepositoryInput,
  UpdateClientRepositoryInput,
} from "../client.types";

export class ClientRepository {
  async create(data: CreateClientRepositoryInput): Promise<Client> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Client name cannot be empty");
    }
    if (!data.email || data.email.trim().length === 0) {
      throw new Error("Client email cannot be empty");
    }
    if (!data.workspaceId) {
      throw new Error("Workspace ID is required");
    }

    try {
      const [client] = await db
        .insert(clientsTable)
        .values({
          workspaceId: data.workspaceId,
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          phone: data.phone?.trim() || null,
          website: data.website?.trim() || null,
          companyName: data.companyName?.trim() || null,
          gstNumber: data.gstNumber?.trim() || null,
          contactPerson: data.contactPerson?.trim() || null,
          department: data.department?.trim() || null,
          address: data.address?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          postalCode: data.postalCode?.trim() || null,
          country: data.country?.trim() || "IN",
          status: "active",
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
        })
        .returning();

      if (!client) {
        throw new Error("Failed to create client");
      }

      return client;
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (
        pgError.code === "23505" &&
        pgError.constraint === "idx_clients_workspace_email"
      ) {
        throw new Error(
          "A client with this email already exists in this workspace",
        );
      }
      if (pgError.code === "23503") {
        throw new Error(
          `Workspace with ID '${data.workspaceId}' does not exist in database. Ensure DB schema is pushed ('pnpm --filter @repo/database db:push') and restart API server.`,
        );
      }
      throw error;
    }
  }

  async getById(
    id: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Client | null> {
    const conditions = [
      eq(clientsTable.id, id),
      eq(clientsTable.workspaceId, workspaceId),
    ];

    if (!options?.includeDeleted) {
      conditions.push(isNull(clientsTable.deletedAt));
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(...conditions));

    return client || null;
  }

  async getByEmail(
    email: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Client | null> {
    const conditions = [
      eq(clientsTable.email, email.toLowerCase().trim()),
      eq(clientsTable.workspaceId, workspaceId),
    ];

    if (!options?.includeDeleted) {
      conditions.push(isNull(clientsTable.deletedAt));
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(...conditions));

    return client || null;
  }

  async list(filters: ClientQueryFilters): Promise<Client[]> {
    const conditions = [eq(clientsTable.workspaceId, filters.workspaceId)];

    if (filters.status && filters.status !== "all") {
      conditions.push(eq(clientsTable.status, filters.status));
    }

    if (filters.excludeDeleted !== false) {
      conditions.push(isNull(clientsTable.deletedAt));
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = `%${filters.search.trim()}%`;
      const searchCond = or(
        ilike(clientsTable.name, term),
        ilike(clientsTable.email, term),
        ilike(clientsTable.companyName, term),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    return db
      .select()
      .from(clientsTable)
      .where(and(...conditions))
      .orderBy(clientsTable.updatedAt);
  }

  async update(
    id: string,
    workspaceId: string,
    data: UpdateClientRepositoryInput,
  ): Promise<Client> {
    const updateData: Partial<typeof clientsTable.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: data.updatedBy,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined)
      updateData.email = data.email.toLowerCase().trim();
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.companyName !== undefined)
      updateData.companyName = data.companyName;
    if (data.gstNumber !== undefined) updateData.gstNumber = data.gstNumber;
    if (data.contactPerson !== undefined)
      updateData.contactPerson = data.contactPerson;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.status !== undefined) updateData.status = data.status;

    try {
      const [client] = await db
        .update(clientsTable)
        .set(updateData)
        .where(
          and(
            eq(clientsTable.id, id),
            eq(clientsTable.workspaceId, workspaceId),
            isNull(clientsTable.deletedAt),
          ),
        )
        .returning();

      if (!client) {
        throw new Error(`Client with ID ${id} not found or already deleted`);
      }

      return client;
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (
        pgError.code === "23505" &&
        pgError.constraint === "idx_clients_workspace_email"
      ) {
        throw new Error(
          "A client with this email already exists in this workspace",
        );
      }
      throw error;
    }
  }

  async softDelete(
    id: string,
    workspaceId: string,
    deletedBy: string,
  ): Promise<Client> {
    const [client] = await db
      .update(clientsTable)
      .set({
        deletedAt: new Date(),
        status: "archived",
        updatedBy: deletedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clientsTable.id, id),
          eq(clientsTable.workspaceId, workspaceId),
          isNull(clientsTable.deletedAt),
        ),
      )
      .returning();

    if (!client) {
      throw new Error(`Client with ID ${id} not found or already deleted`);
    }

    return client;
  }

  async restore(
    id: string,
    workspaceId: string,
    restoredBy: string,
  ): Promise<Client> {
    const [client] = await db
      .update(clientsTable)
      .set({
        deletedAt: null,
        status: "active",
        updatedBy: restoredBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clientsTable.id, id),
          eq(clientsTable.workspaceId, workspaceId),
          isNotNull(clientsTable.deletedAt),
        ),
      )
      .returning();

    if (!client) {
      throw new Error(`Deleted client with ID ${id} not found`);
    }

    return client;
  }
}
