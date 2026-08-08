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
 * Service-layer types
 * Inputs/outputs of WorkspaceService.
 * Service input stops at business fields, owner/actor IDs are passed explicitly as arguments.
 */
export interface CreateWorkspaceServiceInput {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
}

export interface UpdateWorkspaceServiceInput {
  name?: string;
  description?: string;
  logo?: string;
}

interface CreateWorkspaceMemberServiceInput {
  workspaceId: string;
  userId: string;
  role?: WorkspaceRole;
}

interface UpdateWorkspaceMemberServiceInput {
  role?: WorkspaceRole;
}

interface AddMemberServiceInput {
  userId: string;
  role?: WorkspaceRole;
}

/**
 * Repository input types
 * Persistence-ready data structures.
 */
export interface CreateWorkspaceRepositoryInput {
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  ownerId: string;
}

export interface UpdateWorkspaceRepositoryInput {
  name?: string;
  description?: string;
  logo?: string;
}

export interface CreateWorkspaceMemberRepositoryInput {
  workspaceId: string;
  userId: string;
  role?: WorkspaceRole;
  invitedBy?: string | null;
}

export interface UpdateWorkspaceMemberRepositoryInput {
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
 * Workspace paired with the caller's membership — used for listings for the
 * future workspace switcher.
 */
interface WorkspaceMembershipView {
  workspace: Workspace;
  membership: WorkspaceMember;
}
