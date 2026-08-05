/**
 * Workspace domain types
 * Types inferred from Drizzle schema
 */

import type { Workspace, WorkspaceMember, WorkspaceRole } from "@repo/database";

/**
 * API response types
 */
export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMemberResponse {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
  invitedBy: string | null;
  leftAt: Date | null;
}

/**
 * Input types for creating/updating workspaces
 */
export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  ownerId: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  logo?: string;
}

export interface CreateWorkspaceMemberInput {
  workspaceId: string;
  userId: string;
  role?: WorkspaceRole;
  invitedBy?: string | null;
}

export interface UpdateWorkspaceMemberInput {
  role?: WorkspaceRole;
}

/**
 * Query filter types
 */
export interface WorkspaceQueryFilters {
  ownerId?: string;
  slug?: string;
  excludeDeleted?: boolean;
}

export interface WorkspaceMemberQueryFilters {
  workspaceId?: string;
  userId?: string;
  role?: WorkspaceRole;
  excludeDeleted?: boolean;
}

/**
 * Service-layer types
 * Inputs/outputs of WorkspaceService. Validation boundary owns the actorId:
 * controller derives it from auth; service input stops at workspace fields.
 */
export interface CreateWorkspaceServiceInput {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
}

export interface AddMemberServiceInput {
  userId: string;
  role?: WorkspaceRole;
}

/**
 * Workspace paired with the caller's membership — used for listings for the
 * future workspace switcher.
 */
export interface WorkspaceMembershipView {
  workspace: Workspace;
  membership: WorkspaceMember;
}
