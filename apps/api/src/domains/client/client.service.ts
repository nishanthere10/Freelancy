import type { Client } from "@repo/database";
import type { WorkspaceMemberRepository } from "../workspace/repository";
import {
  ClientDeletedError,
  ClientDomainError,
  ClientEmailAlreadyExistsError,
  ClientInternalError,
  ClientNotDeletedError,
  ClientNotFoundError,
  ClientPermissionDeniedError,
} from "./client.errors";
import type { IClientEventEmitter } from "./client.events";
import {
  canCreateClient,
  canDeleteClient,
  canRestoreClient,
  canUpdateClient,
  canViewClient,
} from "./client.policies";
import type { ClientRepository } from "./repository/client.repository";
import type {
  ClientQueryFilters,
  CreateClientServiceInput,
  UpdateClientServiceInput,
} from "./client.types";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ClientDomainError };

function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

function err<T>(error: ClientDomainError): Result<T> {
  return { success: false, error };
}

export class ClientService {
  constructor(
    private readonly clientRepo: ClientRepository,
    private readonly memberRepo: WorkspaceMemberRepository,
    private readonly eventEmitter: IClientEventEmitter,
  ) {}

  async createClient(
    input: CreateClientServiceInput,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<Client>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canCreateClient(membership);
      if (!policy.allowed) {
        return err(
          new ClientPermissionDeniedError(
            "create",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.clientRepo.getByEmail(input.email, workspaceId);
      if (existing) {
        return err(new ClientEmailAlreadyExistsError(input.email, workspaceId));
      }

      const client = await this.clientRepo.create({
        ...input,
        workspaceId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      await this.eventEmitter.emit({
        type: "client.created",
        clientId: client.id,
        workspaceId: client.workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        client,
      });

      return ok(client);
    } catch (error: unknown) {
      if (error instanceof ClientDomainError) return err(error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("already exists")) {
        return err(new ClientEmailAlreadyExistsError(input.email, workspaceId));
      }
      return err(new ClientInternalError("createClient", error));
    }
  }

  async getClient(
    clientId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<Client>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canViewClient(membership);
      if (!policy.allowed) {
        return err(
          new ClientPermissionDeniedError(
            "view",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const client = await this.clientRepo.getById(clientId, workspaceId);
      if (!client) {
        return err(new ClientNotFoundError(clientId));
      }

      return ok(client);
    } catch (error: unknown) {
      if (error instanceof ClientDomainError) return err(error);
      return err(new ClientInternalError("getClient", error));
    }
  }

  async listClients(
    workspaceId: string,
    actorId: string,
    filters?: Omit<ClientQueryFilters, "workspaceId">,
  ): Promise<Result<Client[]>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canViewClient(membership);
      if (!policy.allowed) {
        return err(
          new ClientPermissionDeniedError(
            "list",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const clients = await this.clientRepo.list({
        workspaceId,
        ...filters,
      });

      return ok(clients);
    } catch (error: unknown) {
      if (error instanceof ClientDomainError) return err(error);
      return err(new ClientInternalError("listClients", error));
    }
  }

  async updateClient(
    clientId: string,
    workspaceId: string,
    input: UpdateClientServiceInput,
    actorId: string,
  ): Promise<Result<Client>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canUpdateClient(membership);
      if (!policy.allowed) {
        return err(
          new ClientPermissionDeniedError(
            "update",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.clientRepo.getById(clientId, workspaceId, {
        includeDeleted: true,
      });
      if (!existing) {
        return err(new ClientNotFoundError(clientId));
      }
      if (existing.deletedAt) {
        return err(new ClientDeletedError(clientId, "update"));
      }

      if (input.email && input.email.toLowerCase() !== existing.email.toLowerCase()) {
        const emailCheck = await this.clientRepo.getByEmail(input.email, workspaceId);
        if (emailCheck && emailCheck.id !== clientId) {
          return err(new ClientEmailAlreadyExistsError(input.email, workspaceId));
        }
      }

      const updated = await this.clientRepo.update(clientId, workspaceId, {
        ...input,
        updatedBy: actorId,
      });

      await this.eventEmitter.emit({
        type: "client.updated",
        clientId: updated.id,
        workspaceId: updated.workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        client: updated,
        changes: input,
      });

      return ok(updated);
    } catch (error: unknown) {
      if (error instanceof ClientDomainError) return err(error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("already exists")) {
        return err(new ClientEmailAlreadyExistsError(input.email || "", workspaceId));
      }
      return err(new ClientInternalError("updateClient", error));
    }
  }

  async deleteClient(
    clientId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<Client>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canDeleteClient(membership);
      if (!policy.allowed) {
        return err(
          new ClientPermissionDeniedError(
            "delete",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.clientRepo.getById(clientId, workspaceId, {
        includeDeleted: true,
      });
      if (!existing) {
        return err(new ClientNotFoundError(clientId));
      }
      if (existing.deletedAt) {
        return err(new ClientDeletedError(clientId, "delete"));
      }

      const deleted = await this.clientRepo.softDelete(
        clientId,
        workspaceId,
        actorId,
      );

      await this.eventEmitter.emit({
        type: "client.deleted",
        clientId: deleted.id,
        workspaceId: deleted.workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        client: deleted,
      });

      return ok(deleted);
    } catch (error: unknown) {
      if (error instanceof ClientDomainError) return err(error);
      return err(new ClientInternalError("deleteClient", error));
    }
  }

  async restoreClient(
    clientId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<Client>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canRestoreClient(membership);
      if (!policy.allowed) {
        return err(
          new ClientPermissionDeniedError(
            "restore",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.clientRepo.getById(clientId, workspaceId, {
        includeDeleted: true,
      });
      if (!existing) {
        return err(new ClientNotFoundError(clientId));
      }
      if (!existing.deletedAt) {
        return err(new ClientNotDeletedError(clientId));
      }

      const restored = await this.clientRepo.restore(
        clientId,
        workspaceId,
        actorId,
      );

      await this.eventEmitter.emit({
        type: "client.restored",
        clientId: restored.id,
        workspaceId: restored.workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        client: restored,
      });

      return ok(restored);
    } catch (error: unknown) {
      if (error instanceof ClientDomainError) return err(error);
      return err(new ClientInternalError("restoreClient", error));
    }
  }
}
