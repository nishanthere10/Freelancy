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

export function canViewInvoice(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "INVOICE_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  return POLICY_ALLOW;
}

export function canCreateInvoice(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "INVOICE_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  if (!hasAtLeastRole(membership.role, "editor")) {
    return deny(
      "INVOICE_INSUFFICIENT_ROLE",
      `role '${membership.role}' cannot create invoices; 'editor' or 'owner' required`,
    );
  }
  return POLICY_ALLOW;
}

export function canUpdateInvoice(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "INVOICE_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  if (!hasAtLeastRole(membership.role, "editor")) {
    return deny(
      "INVOICE_INSUFFICIENT_ROLE",
      `role '${membership.role}' cannot update invoices; 'editor' or 'owner' required`,
    );
  }
  return POLICY_ALLOW;
}

export function canSendInvoice(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "INVOICE_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  if (!hasAtLeastRole(membership.role, "editor")) {
    return deny(
      "INVOICE_INSUFFICIENT_ROLE",
      `role '${membership.role}' cannot send invoices; 'editor' or 'owner' required`,
    );
  }
  return POLICY_ALLOW;
}

export function canRecordPayment(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "INVOICE_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  if (!hasAtLeastRole(membership.role, "editor")) {
    return deny(
      "INVOICE_INSUFFICIENT_ROLE",
      `role '${membership.role}' cannot record payments; 'editor' or 'owner' required`,
    );
  }
  return POLICY_ALLOW;
}

export function canCancelInvoice(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "INVOICE_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  if (membership.role !== "owner") {
    return deny(
      "INVOICE_INSUFFICIENT_ROLE",
      `role '${membership.role}' cannot cancel invoices; 'owner' required`,
    );
  }
  return POLICY_ALLOW;
}

export function canDeleteInvoice(
  membership: WorkspaceMember | null,
): PolicyResult {
  if (!membership) {
    return deny(
      "INVOICE_NOT_A_MEMBER",
      "actor is not a member of the workspace",
    );
  }
  if (membership.role !== "owner") {
    return deny(
      "INVOICE_INSUFFICIENT_ROLE",
      `role '${membership.role}' cannot delete invoices; 'owner' required`,
    );
  }
  return POLICY_ALLOW;
}
