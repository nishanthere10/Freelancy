/**
 * Workspace domain events
 *
 * Strongly typed payloads describing facts that occurred within the
 * workspace domain. This module defines the event shapes, factory
 * functions, and an emitter port — it intentionally does NOT implement
 * a bus, queue, or persistence. Publishing is a future integration
 * concern (see TODO markers).
 */

import type { WorkspaceRole } from "@repo/database";

/**
 * Discriminator for all workspace domain events.
 */
type WorkspaceEventType =
  | "workspace.created"
  | "workspace.updated"
  | "workspace.deleted"
  | "workspace.restored"
  | "workspace.ownership_transferred"
  | "workspace.member_added"
  | "workspace.member_removed"
  | "workspace.member_role_changed";

/**
 * Common metadata carried by every domain event.
 */
interface WorkspaceDomainEventBase {
  /** Event discriminator */
  readonly type: WorkspaceEventType;
  /** Workspace the event pertains to */
  readonly workspaceId: string;
  /** User who initiated the change */
  readonly actorId: string;
  /** When the event occurred (ISO-8601) */
  readonly occurredAt: string;
}

interface WorkspaceCreatedPayload {
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly ownerId: string;
}

export interface WorkspaceCreatedEvent extends WorkspaceDomainEventBase {
  readonly type: "workspace.created";
  readonly payload: WorkspaceCreatedPayload;
}

export interface WorkspaceUpdatedPayload {
  /** Names of fields that actually changed */
  readonly changedFields: readonly ("name" | "description" | "logo")[];
  readonly previousValues: {
    readonly name?: string;
    readonly description?: string | null;
    readonly logo?: string | null;
  };
}

export interface WorkspaceUpdatedEvent extends WorkspaceDomainEventBase {
  readonly type: "workspace.updated";
  readonly payload: WorkspaceUpdatedPayload;
}

interface WorkspaceDeletedPayload {
  readonly name: string;
  readonly slug: string;
}

export interface WorkspaceDeletedEvent extends WorkspaceDomainEventBase {
  readonly type: "workspace.deleted";
  readonly payload: WorkspaceDeletedPayload;
}

type WorkspaceRestoredPayload = WorkspaceDeletedPayload;

export interface WorkspaceRestoredEvent extends WorkspaceDomainEventBase {
  readonly type: "workspace.restored";
  readonly payload: WorkspaceRestoredPayload;
}

interface WorkspaceOwnershipTransferredPayload {
  readonly previousOwnerId: string;
  readonly newOwnerId: string;
}

export interface WorkspaceOwnershipTransferredEvent
  extends WorkspaceDomainEventBase {
  readonly type: "workspace.ownership_transferred";
  readonly payload: WorkspaceOwnershipTransferredPayload;
}

interface WorkspaceMemberAddedPayload {
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly invitedBy: string | null;
}

export interface WorkspaceMemberAddedEvent extends WorkspaceDomainEventBase {
  readonly type: "workspace.member_added";
  readonly payload: WorkspaceMemberAddedPayload;
}

interface WorkspaceMemberRemovedPayload {
  readonly userId: string;
  readonly role: WorkspaceRole;
  /** True when the user removed themselves (leave) */
  readonly selfRemoved: boolean;
}

export interface WorkspaceMemberRemovedEvent extends WorkspaceDomainEventBase {
  readonly type: "workspace.member_removed";
  readonly payload: WorkspaceMemberRemovedPayload;
}

interface WorkspaceMemberRoleChangedPayload {
  readonly userId: string;
  readonly previousRole: WorkspaceRole;
  readonly newRole: WorkspaceRole;
}

export interface WorkspaceMemberRoleChangedEvent
  extends WorkspaceDomainEventBase {
  readonly type: "workspace.member_role_changed";
  readonly payload: WorkspaceMemberRoleChangedPayload;
}

/**
 * Closed union of all workspace domain events.
 */
export type WorkspaceDomainEvent =
  | WorkspaceCreatedEvent
  | WorkspaceUpdatedEvent
  | WorkspaceDeletedEvent
  | WorkspaceRestoredEvent
  | WorkspaceOwnershipTransferredEvent
  | WorkspaceMemberAddedEvent
  | WorkspaceMemberRemovedEvent
  | WorkspaceMemberRoleChangedEvent;

function baseMetadata(
  workspaceId: string,
  actorId: string,
): Pick<WorkspaceDomainEventBase, "workspaceId" | "actorId" | "occurredAt"> {
  return {
    workspaceId,
    actorId,
    occurredAt: new Date().toISOString(),
  };
}

export function workspaceCreated(input: {
  workspaceId: string;
  actorId: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
}): WorkspaceCreatedEvent {
  return {
    type: "workspace.created",
    ...baseMetadata(input.workspaceId, input.actorId),
    payload: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      ownerId: input.ownerId,
    },
  };
}

export function workspaceUpdated(input: {
  workspaceId: string;
  actorId: string;
  changedFields: WorkspaceUpdatedPayload["changedFields"];
  previousValues: WorkspaceUpdatedPayload["previousValues"];
}): WorkspaceUpdatedEvent {
  return {
    type: "workspace.updated",
    ...baseMetadata(input.workspaceId, input.actorId),
    payload: {
      changedFields: input.changedFields,
      previousValues: input.previousValues,
    },
  };
}

export function workspaceDeleted(input: {
  workspaceId: string;
  actorId: string;
  name: string;
  slug: string;
}): WorkspaceDeletedEvent {
  return {
    type: "workspace.deleted",
    ...baseMetadata(input.workspaceId, input.actorId),
    payload: { name: input.name, slug: input.slug },
  };
}

export function workspaceRestored(input: {
  workspaceId: string;
  actorId: string;
  name: string;
  slug: string;
}): WorkspaceRestoredEvent {
  return {
    type: "workspace.restored",
    ...baseMetadata(input.workspaceId, input.actorId),
    payload: { name: input.name, slug: input.slug },
  };
}

export function workspaceOwnershipTransferred(input: {
  workspaceId: string;
  actorId: string;
  previousOwnerId: string;
  newOwnerId: string;
}): WorkspaceOwnershipTransferredEvent {
  return {
    type: "workspace.ownership_transferred",
    ...baseMetadata(input.workspaceId, input.actorId),
    payload: {
      previousOwnerId: input.previousOwnerId,
      newOwnerId: input.newOwnerId,
    },
  };
}

export function workspaceMemberAdded(input: {
  workspaceId: string;
  actorId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy: string | null;
}): WorkspaceMemberAddedEvent {
  return {
    type: "workspace.member_added",
    ...baseMetadata(input.workspaceId, input.actorId),
    payload: {
      userId: input.userId,
      role: input.role,
      invitedBy: input.invitedBy,
    },
  };
}

export function workspaceMemberRemoved(input: {
  workspaceId: string;
  actorId: string;
  userId: string;
  role: WorkspaceRole;
  selfRemoved: boolean;
}): WorkspaceMemberRemovedEvent {
  return {
    type: "workspace.member_removed",
    ...baseMetadata(input.workspaceId, input.actorId),
    payload: {
      userId: input.userId,
      role: input.role,
      selfRemoved: input.selfRemoved,
    },
  };
}

export function workspaceMemberRoleChanged(input: {
  workspaceId: string;
  actorId: string;
  userId: string;
  previousRole: WorkspaceRole;
  newRole: WorkspaceRole;
}): WorkspaceMemberRoleChangedEvent {
  return {
    type: "workspace.member_role_changed",
    ...baseMetadata(input.workspaceId, input.actorId),
    payload: {
      userId: input.userId,
      previousRole: input.previousRole,
      newRole: input.newRole,
    },
  };
}

/**
 * Emitter port. The service knows only this interface.
 *
 * TODO(eventing): provide a concrete publisher (BullMQ / event bus) in the
 * composition root during Sprint 1 - Phase 3. For now the default is a
 * deliberate no-op so domain logic is exercised without infrastructure.
 */
export interface IWorkspaceEventEmitter {
  emit(event: WorkspaceDomainEvent): void;
}

/**
 * Default no-op emitter used until a real publisher is wired.
 */
export class NullWorkspaceEventEmitter implements IWorkspaceEventEmitter {
  emit(): void {
    // Intentionally empty: publishing is not yet implemented.
  }
}
