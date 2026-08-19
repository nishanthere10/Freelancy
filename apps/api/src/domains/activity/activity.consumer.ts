import { logger } from "../../utils/logger";
import type {
  ClientDomainEvent,
  IClientEventEmitter,
} from "../client/client.events";
import type {
  IInvoiceEventEmitter,
  InvoiceDomainEvent,
} from "../invoice/invoice.events";
import type {
  IProjectEventEmitter,
  ProjectDomainEvent,
} from "../project/project.events";
import type {
  IWorkspaceEventEmitter,
  WorkspaceDomainEvent,
} from "../workspace/workspace.events";
import type {
  ActivityEntityType,
  ActivityEventType,
  ActivityMetadata,
  CreateActivityInput,
} from "./activity.types";
import type { ActivityRepository } from "./repository/activity.repository";

/**
 * ActivityEventConsumer
 * Ingests domain events from all domains and persists them to the activity repository.
 * Non-blocking / fail-safe: errors in activity persistence are logged but never crash
 * or roll back the primary business transaction.
 */
export class ActivityEventConsumer implements IWorkspaceEventEmitter {
  constructor(private readonly activityRepo: ActivityRepository) {}

  /**
   * Universal event ingest method
   */
  async ingest(input: CreateActivityInput): Promise<void> {
    try {
      await this.activityRepo.create(input);
      logger.debug("Activity event persisted", {
        workspaceId: input.workspaceId,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
      });
    } catch (error) {
      logger.error("Failed to persist activity event", {
        workspaceId: input.workspaceId,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Workspace event handler (implements IWorkspaceEventEmitter)
   */
  emit(event: WorkspaceDomainEvent): void {
    const input = this.mapWorkspaceEvent(event);
    if (input) {
      this.ingest(input).catch((err) => {
        logger.error("Async workspace activity ingestion error", {
          error: err,
        });
      });
    }
  }

  /**
   * Client event handler (Promise port interface)
   */
  async emitClient(event: ClientDomainEvent): Promise<void> {
    const input = this.mapClientEvent(event);
    if (input) {
      await this.ingest(input);
    }
  }

  /**
   * Project event handler (Promise port interface)
   */
  async emitProject(event: ProjectDomainEvent): Promise<void> {
    const input = this.mapProjectEvent(event);
    if (input) {
      await this.ingest(input);
    }
  }

  /**
   * Invoice event handler (Promise port interface)
   */
  async emitInvoice(event: InvoiceDomainEvent): Promise<void> {
    const input = this.mapInvoiceEvent(event);
    if (input) {
      await this.ingest(input);
    }
  }

  // Domain Mapping Helpers

  private mapWorkspaceEvent(
    event: WorkspaceDomainEvent,
  ): CreateActivityInput | null {
    const base = {
      workspaceId: event.workspaceId,
      actorUserId: event.actorId,
      eventType: event.type as ActivityEventType,
      createdAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
    };

    switch (event.type) {
      case "workspace.created":
        return {
          ...base,
          entityType: "workspace",
          entityId: event.workspaceId,
          metadata: {
            entityName: event.payload.name,
            slug: event.payload.slug,
          },
        };
      case "workspace.updated":
        return {
          ...base,
          entityType: "workspace",
          entityId: event.workspaceId,
          metadata: {
            changedFields: event.payload.changedFields as string[],
          },
        };
      case "workspace.deleted":
      case "workspace.restored":
        return {
          ...base,
          entityType: "workspace",
          entityId: event.workspaceId,
          metadata: {
            entityName: event.payload.name,
            slug: event.payload.slug,
          },
        };
      case "workspace.member_added":
        return {
          ...base,
          entityType: "member",
          entityId: event.payload.userId,
          metadata: {
            userId: event.payload.userId,
            role: event.payload.role,
          },
        };
      case "workspace.member_removed":
        return {
          ...base,
          entityType: "member",
          entityId: event.payload.userId,
          metadata: {
            userId: event.payload.userId,
            role: event.payload.role,
            selfRemoved: event.payload.selfRemoved,
          },
        };
      case "workspace.member_role_changed":
        return {
          ...base,
          entityType: "member",
          entityId: event.payload.userId,
          metadata: {
            userId: event.payload.userId,
            previousRole: event.payload.previousRole,
            newRole: event.payload.newRole,
          },
        };
      case "workspace.ownership_transferred":
        return {
          ...base,
          entityType: "workspace",
          entityId: event.workspaceId,
          metadata: {
            previousOwnerId: event.payload.previousOwnerId,
            newOwnerId: event.payload.newOwnerId,
          },
        };
      default:
        return null;
    }
  }

  private mapClientEvent(event: ClientDomainEvent): CreateActivityInput | null {
    return {
      workspaceId: event.workspaceId,
      actorUserId: event.actorId,
      eventType: event.type as ActivityEventType,
      entityType: "client",
      entityId: event.clientId,
      metadata: {
        entityName: event.client?.name,
        companyName: event.client?.companyName || undefined,
        email: event.client?.email,
      },
      createdAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
    };
  }

  private mapProjectEvent(
    event: ProjectDomainEvent,
  ): CreateActivityInput | null {
    const metadata: ActivityMetadata = {
      entityName: event.project?.name,
      status: event.project?.status,
      amount: event.project?.budgetAmount || undefined,
      currency: event.project?.budgetCurrency || "INR",
    };

    if (event.type === "project.status_changed") {
      metadata.fromStatus = event.fromStatus;
      metadata.toStatus = event.toStatus;
    }

    return {
      workspaceId: event.workspaceId,
      actorUserId: event.actorId,
      eventType: event.type as ActivityEventType,
      entityType: "project",
      entityId: event.projectId,
      metadata,
      createdAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
    };
  }

  private mapInvoiceEvent(
    event: InvoiceDomainEvent,
  ): CreateActivityInput | null {
    const invoice = "invoice" in event ? event.invoice : undefined;
    const metadata: ActivityMetadata = {
      invoiceNumber: invoice?.invoiceNumber || undefined,
      amount: invoice?.totalAmount || undefined,
      currency: invoice?.currency || "INR",
      status: invoice?.status || undefined,
    };

    return {
      workspaceId: event.workspaceId,
      actorUserId: event.actorId,
      eventType: event.type as ActivityEventType,
      entityType: "invoice",
      entityId: event.invoiceId,
      metadata,
      createdAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
    };
  }
}

/**
 * Adapter wrappers for domain services that expect specific EventEmitter interfaces
 */
export class ClientEventEmitterAdapter implements IClientEventEmitter {
  constructor(private readonly consumer: ActivityEventConsumer) {}
  async emit(event: ClientDomainEvent): Promise<void> {
    await this.consumer.emitClient(event);
  }
}

export class ProjectEventEmitterAdapter implements IProjectEventEmitter {
  constructor(private readonly consumer: ActivityEventConsumer) {}
  async emit(event: ProjectDomainEvent): Promise<void> {
    await this.consumer.emitProject(event);
  }
}

export class InvoiceEventEmitterAdapter implements IInvoiceEventEmitter {
  constructor(private readonly consumer: ActivityEventConsumer) {}
  async emit(event: InvoiceDomainEvent): Promise<void> {
    await this.consumer.emitInvoice(event);
  }
}
