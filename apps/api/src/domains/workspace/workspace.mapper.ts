/**
 * Response mapper for workspace domain
 * Converts domain results to HTTP DTOs
 */

import type { Workspace, WorkspaceMember } from "@repo/database";
import type {
  WorkspaceMemberResponse,
  WorkspaceResponse,
} from "./workspace.types";

/**
 * Map workspace entity to HTTP response
 */
export function mapWorkspaceToResponse(
  workspace: Workspace,
): WorkspaceResponse {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    logo: workspace.logo,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

/**
 * Map multiple workspaces to HTTP responses
 */
export function mapWorkspacesToResponse(
  workspaces: Workspace[],
): WorkspaceResponse[] {
  return workspaces.map(mapWorkspaceToResponse);
}

/**
 * Map workspace memberships (workspace + role) to responses
 */
export function mapMembershipsToResponse(
  memberships: Array<{ workspace: Workspace; role: string }>,
): WorkspaceResponse[] {
  return memberships.map(({ workspace }) => mapWorkspaceToResponse(workspace));
}

/**
 * Map workspace member entity to HTTP response
 */
export function mapMemberToResponse(
  member: WorkspaceMember,
): WorkspaceMemberResponse {
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    invitedBy: member.invitedBy,
    leftAt: member.leftAt,
  };
}

/**
 * Map multiple members to HTTP responses
 */
export function mapMembersToResponse(
  members: WorkspaceMember[],
): WorkspaceMemberResponse[] {
  return members.map(mapMemberToResponse);
}
