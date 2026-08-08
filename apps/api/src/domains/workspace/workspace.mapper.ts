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
 * Map workspace memberships (workspace + role) to responses
 */
export function mapMembershipsToResponse(
  memberships: Array<{ workspace: Workspace; role: string }>,
): WorkspaceResponse[] {
  return memberships.map(({ workspace }) => mapWorkspaceToResponse(workspace));
}

