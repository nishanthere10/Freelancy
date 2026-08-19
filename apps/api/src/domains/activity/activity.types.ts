import type { ActivityEvent } from "@repo/database";

export type ActivityEventType =
  // Workspace events
  | "workspace.created"
  | "workspace.updated"
  | "workspace.deleted"
  | "workspace.restored"
  | "workspace.ownership_transferred"
  | "workspace.member_added"
  | "workspace.member_removed"
  | "workspace.member_role_changed"
  // Client events
  | "client.created"
  | "client.updated"
  | "client.deleted"
  | "client.restored"
  // Project events
  | "project.created"
  | "project.updated"
  | "project.status_changed"
  | "project.deleted"
  | "project.restored"
  // Invoice events
  | "invoice.created"
  | "invoice.updated"
  | "invoice.sent"
  | "invoice.paid"
  | "invoice.cancelled"
  | "invoice.deleted";

export type ActivityEntityType =
  | "workspace"
  | "client"
  | "project"
  | "invoice"
  | "member";

export interface ActivityMetadata {
  entityName?: string;
  clientName?: string;
  projectName?: string;
  invoiceNumber?: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  fromStatus?: string;
  toStatus?: string;
  role?: string;
  previousRole?: string;
  newRole?: string;
  changedFields?: string[];
  [key: string]: unknown;
}

export interface CreateActivityInput {
  workspaceId: string;
  actorUserId?: string | null;
  eventType: ActivityEventType;
  entityType: ActivityEntityType;
  entityId?: string | null;
  metadata?: ActivityMetadata;
  createdAt?: Date;
}

export interface ActivityQueryFilters {
  limit?: number;
  cursor?: string; // ISO date string or event ID for cursor-based pagination
  entityType?: ActivityEntityType;
  entityId?: string;
  actorUserId?: string;
}

export interface ActivityActorDTO {
  id: string;
  name: string;
  email: string;
}

export interface ActivityItemDTO {
  id: string;
  workspaceId: string;
  eventType: ActivityEventType;
  entityType: ActivityEntityType;
  entityId: string | null;
  message: string;
  metadata: ActivityMetadata;
  actor: ActivityActorDTO | null;
  createdAt: string;
}

export interface ActivityListResponseDTO {
  items: ActivityItemDTO[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}
