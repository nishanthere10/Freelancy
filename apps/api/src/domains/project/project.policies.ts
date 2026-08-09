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

export function canCreateProject(membership: WorkspaceMember | null): PolicyResult {
  if (!membership) {
    return deny("PROJECT_NOT_A_MEMBER", "actor is not a member of the workspace");
  }
  if (!hasAtLeastRole(membership.role, "editor")) {
    return deny("PROJECT_INSUFFICIENT_ROLE", `role '${membership.role}' cannot create projects; 'editor' or 'owner' required`);
  }
  return POLICY_ALLOW;
}

export function canViewProject(membership: WorkspaceMember | null): PolicyResult {
  if (!membership) {
    return deny("PROJECT_NOT_A_MEMBER", "actor is not a member of the workspace");
  }
  return POLICY_ALLOW;
}

export function canUpdateProject(membership: WorkspaceMember | null): PolicyResult {
  if (!membership) {
    return deny("PROJECT_NOT_A_MEMBER", "actor is not a member of the workspace");
  }
  if (!hasAtLeastRole(membership.role, "editor")) {
    return deny("PROJECT_INSUFFICIENT_ROLE", `role '${membership.role}' cannot update projects; 'editor' or 'owner' required`);
  }
  return POLICY_ALLOW;
}

export function canChangeProjectStatus(membership: WorkspaceMember | null): PolicyResult {
  return canUpdateProject(membership);
}

export function canDeleteProject(membership: WorkspaceMember | null): PolicyResult {
  if (!membership) {
    return deny("PROJECT_NOT_A_MEMBER", "actor is not a member of the workspace");
  }
  if (membership.role !== "owner") {
    return deny("PROJECT_INSUFFICIENT_ROLE", `role '${membership.role}' cannot archive/delete projects; 'owner' required`);
  }
  return POLICY_ALLOW;
}

export function canRestoreProject(membership: WorkspaceMember | null): PolicyResult {
  return canDeleteProject(membership);
}
