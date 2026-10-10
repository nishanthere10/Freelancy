import { aiServiceClient } from "../../ai/client";
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
import { AutomationEventBridge } from "../automation/automation.bridge";
import type { ActivityRepository } from "./repository/activity.repository";

/**
 * ActivityEventConsumer
 * Ingests domain events from all domains and persists them to the activity repository.
 * Non-blocking / fail-safe: errors in activity persistence are logged but never crash
 * or roll back the primary business transaction.
 */
/**
 * Recursively sanitizes and bounds activity metadata to prevent credential leakage
 * and unbounded JSONB database bloat.
 */
export function sanitizeActivityMetadata(
  metadata?: ActivityMetadata,
): ActivityMetadata | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;

  const SENSITIVE_KEY_PATTERN =
    /password|secret|token|apikey|api_key|auth|authorization|credential|creditcard|cvv/i;
  const MAX_STRING_LENGTH = 1000;
  const MAX_KEYS = 50;

  const sanitized: Record<string, unknown> = {};
  let keyCount = 0;

  for (const [k, v] of Object.entries(metadata)) {
    if (keyCount >= MAX_KEYS) break;

    // Redact sensitive keys
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      sanitized[k] = "[REDACTED]";
      keyCount++;
      continue;
    }

    if (typeof v === "string") {
      sanitized[k] =
        v.length > MAX_STRING_LENGTH
          ? `${v.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`
          : v;
    } else if (Array.isArray(v)) {
      sanitized[k] = v
        .slice(0, 50)
        .map((item) =>
          typeof item === "string" && item.length > MAX_STRING_LENGTH
            ? `${item.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`
            : item,
        );
    } else if (v && typeof v === "object") {
      sanitized[k] = sanitizeActivityMetadata(v as ActivityMetadata);
    } else {
      sanitized[k] = v;
    }

    keyCount++;
  }

  return sanitized as ActivityMetadata;
}

export class ActivityEventConsumer implements IWorkspaceEventEmitter {
  constructor(private readonly activityRepo: ActivityRepository) {}

  /**
   * Universal event ingest method with defensive sanitization
   */
  async ingest(input: CreateActivityInput): Promise<void> {
    try {
      const sanitizedInput: CreateActivityInput = {
        ...input,
        metadata: sanitizeActivityMetadata(input.metadata),
      };

      await this.activityRepo.create(sanitizedInput);
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
      void this.ingest(input).catch((err) => {
        logger.error("Async client activity ingestion error", {
          error: err,
        });
      });

      // Dispatch to automation engine
      const automationType =
        event.type === "client.created"
          ? "client.created"
          : event.type === "client.updated"
            ? "client.updated"
            : null;
      if (automationType) {
        void AutomationEventBridge.getInstance().emit(automationType, {
          workspaceId: event.workspaceId,
          actorId: event.actorId,
          entity: { type: "client", id: event.clientId },
          context: { clientId: event.clientId },
          data: event.client ? { ...event.client } : {},
        });
      }
    }
  }

  private readonly aiSyncCooldowns = new Map<string, number>();

  private scheduleAiVectorSync(workspaceId: string): void {
    const now = Date.now();
    const lastSync = this.aiSyncCooldowns.get(workspaceId) || 0;
    if (now - lastSync < 1000) {
      return; // Coalesce rapid duplicate burst events within 1s window
    }
    this.aiSyncCooldowns.set(workspaceId, now);

    // Non-blocking background sync of AI vector memory
    void aiServiceClient.triggerWorkspaceIngest(workspaceId).catch((err) => {
      logger.debug("Background AI vector sync skipped/failed", {
        workspaceId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  /**
   * Project event handler (Promise port interface)
   */
  async emitProject(event: ProjectDomainEvent): Promise<void> {
    const input = this.mapProjectEvent(event);
    if (input) {
      void this.ingest(input).catch((err) => {
        logger.error("Async project activity ingestion error", {
          error: err,
        });
      });

      // Dispatch to automation engine
      const bridge = AutomationEventBridge.getInstance();
      if (event.type === "project.created") {
        void bridge.emit("project.created", {
          workspaceId: event.workspaceId,
          actorId: event.actorId,
          entity: { type: "project", id: event.projectId },
          context: {
            projectId: event.projectId,
            clientId: "project" in event ? event.project?.clientId : undefined,
          },
          data: "project" in event ? { ...event.project } : {},
        });
      } else if (event.type === "project.status_changed") {
        const evType =
          event.toStatus === "completed"
            ? "project.completed"
            : "project.updated";
        void bridge.emit(evType, {
          workspaceId: event.workspaceId,
          actorId: event.actorId,
          entity: { type: "project", id: event.projectId },
          context: { projectId: event.projectId },
          data: { fromStatus: event.fromStatus, toStatus: event.toStatus },
        });
      } else if (event.type === "project.deliverable.completed") {
        void bridge.emit("project.deliverable.completed", {
          workspaceId: event.workspaceId,
          actorId: event.actorId,
          entity: {
            type: "deliverable",
            id:
              "deliverableId" in event
                ? (event as any).deliverableId
                : event.projectId,
          },
          context: { projectId: event.projectId },
          data: {},
        });
      } else if (event.type === "project.change_order.created") {
        void bridge.emit("change_order.proposed", {
          workspaceId: event.workspaceId,
          actorId: event.actorId,
          entity: {
            type: "change_order",
            id:
              "changeOrderId" in event
                ? (event as any).changeOrderId
                : event.projectId,
          },
          context: { projectId: event.projectId },
          data: {},
        });
      } else if (event.type === "project.change_order.approved") {
        void bridge.emit("change_order.approved", {
          workspaceId: event.workspaceId,
          actorId: event.actorId,
          entity: {
            type: "change_order",
            id:
              "changeOrderId" in event
                ? (event as any).changeOrderId
                : event.projectId,
          },
          context: { projectId: event.projectId },
          data: {},
        });
      }
    }

    this.scheduleAiVectorSync(event.workspaceId);
  }

  /**
   * Invoice event handler (Promise port interface)
   */
  async emitInvoice(event: InvoiceDomainEvent): Promise<void> {
    const input = this.mapInvoiceEvent(event);
    if (input) {
      void this.ingest(input).catch((err) => {
        logger.error("Async invoice activity ingestion error", {
          error: err,
        });
      });

      // Dispatch to automation engine
      const bridge = AutomationEventBridge.getInstance();
      const invoice = "invoice" in event ? event.invoice : undefined;
      const context = {
        invoiceId: event.invoiceId,
        clientId: invoice?.clientId,
        projectId: invoice?.projectId || undefined,
      };
      const data = invoice
        ? {
            ...invoice,
            amount: invoice.totalAmount,
            totalAmount: invoice.totalAmount,
          }
        : {};

      if (event.type === "invoice.created") {
        void bridge.emit("invoice.created", {
          workspaceId: event.workspaceId,
          actorId: event.actorId,
          entity: { type: "invoice", id: event.invoiceId },
          context,
          data,
        });
      } else if (event.type === "invoice.sent") {
        void bridge.emit("invoice.sent", {
          workspaceId: event.workspaceId,
          actorId: event.actorId,
          entity: { type: "invoice", id: event.invoiceId },
          context,
          data,
        });
      } else if (event.type === "invoice.paid") {
        void bridge.emit("payment.recorded", {
          workspaceId: event.workspaceId,
          actorId: event.actorId,
          entity: { type: "invoice", id: event.invoiceId },
          context,
          data,
        });
      }
    }

    this.scheduleAiVectorSync(event.workspaceId);
  }

  /**
   * Communication event handler
   */
  async emitCommunication(event: {
    workspaceId: string;
    actorId?: string | null;
    messageId: string;
    channel: "email" | "whatsapp";
    direction: "inbound" | "outbound";
    status: string;
    recipientAddress?: string;
    clientId?: string | null;
  }): Promise<void> {
    const eventType: ActivityEventType =
      event.channel === "email"
        ? event.direction === "inbound"
          ? "communication.email.received"
          : "communication.email.sent"
        : event.direction === "inbound"
          ? "communication.whatsapp.received"
          : "communication.whatsapp.sent";

    const input: CreateActivityInput = {
      workspaceId: event.workspaceId,
      actorUserId: event.actorId ?? null,
      eventType,
      entityType: "communication",
      entityId: event.messageId,
      metadata: {
        status: event.status,
        recipient: event.recipientAddress,
      },
      createdAt: new Date(),
    };

    void this.ingest(input).catch((err) => {
      logger.error("Async communication activity ingestion error", {
        error: err,
      });
    });

    const bridgeType =
      event.channel === "email"
        ? event.direction === "inbound"
          ? "communication.email.received"
          : "communication.email.sent"
        : event.direction === "inbound"
          ? "communication.whatsapp.received"
          : "communication.whatsapp.sent";

    void AutomationEventBridge.getInstance().emit(bridgeType, {
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      entity: { type: "communication", id: event.messageId },
      context: { clientId: event.clientId || undefined },
      data: {
        channel: event.channel,
        direction: event.direction,
        status: event.status,
      },
    });
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
    const isChangeOrder = event.type.startsWith("project.change_order.");
    const metadata: ActivityMetadata = isChangeOrder
      ? {
          entityName: "title" in event ? event.title : undefined,
          changeOrderNumber:
            "changeOrderNumber" in event ? event.changeOrderNumber : undefined,
          amount:
            "additionalBudget" in event ? event.additionalBudget : undefined,
          invoiceId: "invoiceId" in event ? event.invoiceId : undefined,
        }
      : {
          entityName: "project" in event ? event.project?.name : undefined,
          status: "project" in event ? event.project?.status : undefined,
          amount:
            "project" in event
              ? event.project?.budgetAmount || undefined
              : undefined,
          currency:
            "project" in event ? event.project?.budgetCurrency || "INR" : "INR",
        };

    if (event.type === "project.status_changed") {
      metadata.fromStatus = event.fromStatus;
      metadata.toStatus = event.toStatus;
    }

    return {
      workspaceId: event.workspaceId,
      actorUserId: event.actorId,
      eventType: event.type as ActivityEventType,
      entityType: isChangeOrder ? "change_order" : "project",
      entityId:
        isChangeOrder && "changeOrderId" in event
          ? event.changeOrderId
          : event.projectId,
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
    try {
      void this.consumer.emitClient(event).catch((err) => {
        logger.error("Async client activity adapter error", { error: err });
      });
    } catch (err) {
      logger.error("Sync client activity adapter error", { error: err });
    }
  }
}

export class ProjectEventEmitterAdapter implements IProjectEventEmitter {
  constructor(private readonly consumer: ActivityEventConsumer) {}
  async emit(event: ProjectDomainEvent): Promise<void> {
    try {
      void this.consumer.emitProject(event).catch((err) => {
        logger.error("Async project activity adapter error", { error: err });
      });
    } catch (err) {
      logger.error("Sync project activity adapter error", { error: err });
    }
  }
}

export class InvoiceEventEmitterAdapter implements IInvoiceEventEmitter {
  constructor(private readonly consumer: ActivityEventConsumer) {}
  async emit(event: InvoiceDomainEvent): Promise<void> {
    try {
      void this.consumer.emitInvoice(event).catch((err) => {
        logger.error("Async invoice activity adapter error", { error: err });
      });
    } catch (err) {
      logger.error("Sync invoice activity adapter error", { error: err });
    }
  }
}
