import type { WorkspaceMember, WorkspaceRole } from "@repo/database";

export type PolicyResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly code: string; readonly reason: string };

const POLICY_ALLOW: PolicyResult = { allowed: true };

function deny(code: string, reason: string): PolicyResult {
  return { allowed: false, code, reason };
}

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

function hasAtLeastRole(role: WorkspaceRole, required: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export function canCreateClient(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "CLIENT_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  if (!hasAtLeastRole(membership.role, "editor")) {
    return deny(
      "CLIENT_INSUFFICIENT_ROLE",
      `role '${membership.role}' cannot create clients; 'editor' or 'owner' required`,
    );
  }
  return POLICY_ALLOW;
}

export function canViewClient(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "CLIENT_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  return POLICY_ALLOW;
}

export function canUpdateClient(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "CLIENT_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  if (!hasAtLeastRole(membership.role, "editor")) {
    return deny(
      "CLIENT_INSUFFICIENT_ROLE",
      `role '${membership.role}' cannot update clients; 'editor' or 'owner' required`,
    );
  }
  return POLICY_ALLOW;
}

export function canDeleteClient(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "CLIENT_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  if (membership.role !== "owner") {
    return deny(
      "CLIENT_INSUFFICIENT_ROLE",
      `role '${membership.role}' cannot delete clients; 'owner' required`,
    );
  }
  return POLICY_ALLOW;
}

export function canRestoreClient(
  membership: WorkspaceMember | null,
): PolicyResult {
  return canDeleteClient(membership);
}
