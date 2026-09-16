import type { Project, ProjectStatus } from "@repo/database";
import type { UpdateProjectServiceInput } from "./project.types";

export interface ProjectDomainEventBase {
  readonly type: string;
  readonly projectId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly occurredAt: string;
}

export interface ProjectCreatedEvent extends ProjectDomainEventBase {
  readonly type: "project.created";
  readonly project: Project;
}

export interface ProjectUpdatedEvent extends ProjectDomainEventBase {
  readonly type: "project.updated";
  readonly project: Project;
  readonly changes: UpdateProjectServiceInput;
}

export interface ProjectStatusChangedEvent extends ProjectDomainEventBase {
  readonly type: "project.status_changed";
  readonly project: Project;
  readonly fromStatus: ProjectStatus;
  readonly toStatus: ProjectStatus;
}

export interface ProjectDeletedEvent extends ProjectDomainEventBase {
  readonly type: "project.deleted";
  readonly project: Project;
}

export interface ProjectRestoredEvent extends ProjectDomainEventBase {
  readonly type: "project.restored";
  readonly project: Project;
}

export interface ProjectChangeOrderCreatedEvent extends ProjectDomainEventBase {
  readonly type: "project.change_order.created";
  readonly changeOrderId: string;
  readonly changeOrderNumber: string;
  readonly title: string;
  readonly additionalBudget: string;
}

export interface ProjectChangeOrderApprovedEvent
  extends ProjectDomainEventBase {
  readonly type: "project.change_order.approved";
  readonly changeOrderId: string;
  readonly changeOrderNumber: string;
  readonly title: string;
  readonly additionalBudget: string;
  readonly invoiceId?: string | null;
}

export interface ProjectChangeOrderRejectedEvent
  extends ProjectDomainEventBase {
  readonly type: "project.change_order.rejected";
  readonly changeOrderId: string;
  readonly changeOrderNumber: string;
  readonly title: string;
}

export interface ProjectChangeOrderCancelledEvent
  extends ProjectDomainEventBase {
  readonly type: "project.change_order.cancelled";
  readonly changeOrderId: string;
  readonly changeOrderNumber: string;
  readonly title: string;
}

export type ProjectDomainEvent =
  | ProjectCreatedEvent
  | ProjectUpdatedEvent
  | ProjectStatusChangedEvent
  | ProjectDeletedEvent
  | ProjectRestoredEvent
  | ProjectChangeOrderCreatedEvent
  | ProjectChangeOrderApprovedEvent
  | ProjectChangeOrderRejectedEvent
  | ProjectChangeOrderCancelledEvent;

export interface IProjectEventEmitter {
  emit(event: ProjectDomainEvent): Promise<void>;
}

export class NullProjectEventEmitter implements IProjectEventEmitter {
  async emit(_event: ProjectDomainEvent): Promise<void> {
    // No-op implementation for MVP
  }
}
