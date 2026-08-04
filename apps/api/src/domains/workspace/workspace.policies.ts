/**
 * Workspace domain policies
 *
 * Pure business rules for the workspace domain. Every policy is a pure
 * function: it receives already-loaded entities, returns an explicit
 * decision, and never throws, never touches persistence, and never
 * imports framework code.
 *
 * Permission matrix (docs/05-features/workspace.md):
 *   owner  — create, edit, delete, invite, manage members
 *   editor — create and edit content; no workspace management
 *   viewer — read-only
 */

import type { Workspace, WorkspaceMember, WorkspaceRole } from '@repo/database';

/**
 * Explicit policy decision. Denials always carry a machine-stable `code`
 * and a human-readable `reason`.
 */
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

/**
 * Any authenticated user may create a workspace.
 * TODO(billing): enforce per-plan workspace quotas once subscriptions land.
 */
export function canCreateWorkspace(): PolicyResult {
  return POLICY_ALLOW;
}

/**
 * Only members may read a workspace. MVP: every role may read.
 */
export function canViewWorkspace(membership: WorkspaceMember | null): PolicyResult {
  if (!membership) {
    return deny('WORKSPACE_NOT_A_MEMBER', 'actor is not a member of the workspace');
  }
  return POLICY_ALLOW;
}

/**
 * Owners and editors may update workspace profile fields.
 */
export function canUpdateWorkspace(membership: WorkspaceMember | null): PolicyResult {
  if (!membership) {
    return deny('WORKSPACE_NOT_A_MEMBER', 'actor is not a member of the workspace');
  }
  if (!hasAtLeastRole(membership.role, 'editor')) {
    return deny('WORKSPACE_INSUFFICIENT_ROLE', `role '${membership.role}' cannot update workspace`);
  }
  return POLICY_ALLOW;
}

/**
 * Only the owner may delete a workspace.
 */
export function canDeleteWorkspace(membership: WorkspaceMember | null): PolicyResult {
  if (!membership) {
    return deny('WORKSPACE_NOT_A_MEMBER', 'actor is not a member of the workspace');
  }
  if (membership.role !== 'owner') {
    return deny(
      'WORKSPACE_INSUFFICIENT_ROLE',
      `role '${membership.role}' cannot delete workspace; 'owner' required`
    );
  }
  return POLICY_ALLOW;
}

/**
 * Only the owner may restore a soft-deleted workspace.
 */
export function canRestoreWorkspace(
  membership: WorkspaceMember | null
): PolicyResult {
  return canDeleteWorkspace(membership);
}

/**
 * Ownership may be transferred by the current owner to a different active
 * member. MVP allows any member as the target; stricter requirements
 * (e.g. editor-only targets) are a product decision for later.
 */
export function canTransferOwnership(input: {
  actorMembership: WorkspaceMember | null;
  targetMembership: WorkspaceMember | null;
  targetUserId: string;
  actorId: string;
}): PolicyResult {
  if (!input.actorMembership || input.actorMembership.role !== 'owner') {
    return deny(
      'WORKSPACE_INSUFFICIENT_ROLE',
      'only the current owner can transfer ownership'
    );
  }
  if (input.actorId === input.targetUserId) {
    return deny('WORKSPACE_TRANSFER_TO_SELF', 'ownership cannot be transferred to the actor');
  }
  if (!input.targetMembership) {
    return deny(
      'WORKSPACE_TARGET_NOT_MEMBER',
      'new owner must be an active member of the workspace'
    );
  }
  return POLICY_ALLOW;
}

/**
 * Only the owner may invite members.
 */
export function canInviteMembers(membership: WorkspaceMember | null): PolicyResult {
  if (!membership) {
    return deny('WORKSPACE_NOT_A_MEMBER', 'actor is not a member of the workspace');
  }
  if (membership.role !== 'owner') {
    return deny(
      'WORKSPACE_INSUFFICIENT_ROLE',
      `role '${membership.role}' cannot invite members; 'owner' required`
    );
  }
  return POLICY_ALLOW;
}

/**
 * The owner may remove other members; nobody can remove the last owner
 * (self-removal of the last owner is governed by canLeaveWorkspace).
 */
export function canRemoveMember(input: {
  actorMembership: WorkspaceMember | null;
  targetMembership: WorkspaceMember | null;
  activeOwnerCount: number;
}): PolicyResult {
  if (!input.actorMembership) {
    return deny('WORKSPACE_NOT_A_MEMBER', 'actor is not a member of the workspace');
  }
  if (input.actorMembership.role !== 'owner') {
    return deny(
      'WORKSPACE_INSUFFICIENT_ROLE',
      `role '${input.actorMembership.role}' cannot remove members; 'owner' required`
    );
  }
  if (!input.targetMembership) {
    return deny('WORKSPACE_TARGET_NOT_MEMBER', 'target is not an active member of the workspace');
  }
  if (input.actorMembership.userId === input.targetMembership.userId) {
    return deny(
      'WORKSPACE_SELF_REMOVE_INVALID',
      'use the leave operation to remove yourself from a workspace'
    );
  }
  if (input.targetMembership.role === 'owner' && input.activeOwnerCount <= 1) {
    return deny(
      'WORKSPACE_OWNER_REQUIRED',
      'cannot remove the last owner; transfer ownership first'
    );
  }
  return POLICY_ALLOW;
}

/**
 * Any member may leave unless they are the last remaining owner.
 */
export function canLeaveWorkspace(input: {
  actorMembership: WorkspaceMember | null;
  activeOwnerCount: number;
}): PolicyResult {
  if (!input.actorMembership) {
    return deny('WORKSPACE_NOT_A_MEMBER', 'actor is not a member of the workspace');
  }
  if (input.actorMembership.role === 'owner' && input.activeOwnerCount <= 1) {
    return deny(
      'WORKSPACE_OWNER_REQUIRED',
      'the last owner cannot leave; transfer ownership or delete the workspace first'
    );
  }
  return POLICY_ALLOW;
}

/**
 * Only the owner may change a member's role.
 */
export function canChangeMemberRole(input: {
  actorMembership: WorkspaceMember | null;
  targetMembership: WorkspaceMember | null;
  newRole: WorkspaceRole;
}): PolicyResult {
  if (!input.actorMembership) {
    return deny('WORKSPACE_NOT_A_MEMBER', 'actor is not a member of the workspace');
  }
  if (input.actorMembership.role !== 'owner') {
    return deny(
      'WORKSPACE_INSUFFICIENT_ROLE',
      `role '${input.actorMembership.role}' cannot change member roles; 'owner' required`
    );
  }
  if (!input.targetMembership) {
    return deny('WORKSPACE_TARGET_NOT_MEMBER', 'target is not an active member of the workspace');
  }
  if (input.actorMembership.userId === input.targetMembership.userId) {
    return deny(
      'WORKSPACE_SELF_ROLE_CHANGE',
      'owners cannot change their own role; use transfer ownership instead'
    );
  }
  if (input.targetMembership.role === input.newRole) {
    return deny('WORKSPACE_ROLE_UNCHANGED', 'target already holds that role');
  }
  return POLICY_ALLOW;
}

/**
 * Structural guard shared by write operations: acting on a deleted
 * workspace is never allowed. Kept pure so the service can decide which
 * operations must check it.
 */
export function isWorkspaceDeleted(workspace: Workspace): boolean {
  return workspace.deletedAt !== null;
}
