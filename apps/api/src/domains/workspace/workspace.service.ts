/**
 * Workspace service
 * Orchestrates workspace domain logic: policies, events, repository operations.
 *
 * All methods return Result<T> — success carries data; failure carries error.
 * The service never throws: callers always receive an explicit result object.
 *
 * Dependency injection pattern: emitter and repos are constructor-injected,
 * allowing tests to provide fakes without touching persistence.
 */

import type { Workspace, WorkspaceMember, WorkspaceRole } from '@repo/database';
import {
  type WorkspaceDomainError,
  WorkspaceNotFoundError,
  WorkspaceAlreadyExistsError,
  WorkspaceDeletedError,
  WorkspaceNotDeletedError,
  WorkspacePermissionDeniedError,
  WorkspaceOwnershipTransferError,
  WorkspaceOwnerRequiredError,
  WorkspaceMemberNotFoundError,
  WorkspaceMembershipExistsError,
  WorkspaceValidationError,
  WorkspaceInternalError,
  isWorkspaceDomainError,
} from './workspace.errors';
import type { IWorkspaceEventEmitter, WorkspaceDomainEvent } from './workspace.events';
import {
  workspaceCreated,
  workspaceUpdated,
  workspaceDeleted,
  workspaceRestored,
  workspaceOwnershipTransferred,
  workspaceMemberAdded,
  workspaceMemberRemoved,
  workspaceMemberRoleChanged,
  NullWorkspaceEventEmitter,
} from './workspace.events';
import * as policies from './workspace.policies';
import {
  WorkspaceRepository,
  WorkspaceMemberRepository,
} from './repository';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  CreateWorkspaceMemberInput,
  UpdateWorkspaceMemberInput,
} from './workspace.types';
import { createWorkspaceSchema, updateWorkspaceSchema } from './workspace.schema';

/**
 * Result<T>: discriminated union for explicit error handling.
 * Eliminates exceptions for expected domain failures.
 */
export type Result<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: WorkspaceDomainError };

function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

function err<T>(error: WorkspaceDomainError): Result<T> {
  return { success: false, error };
}

/**
 * Workspace Service
 *
 * Core business logic: validates policies, emits domain events, coordinates
 * repository operations. Callers should inspect `result.success` before
 * accessing `result.data` or `result.error`.
 */
export class WorkspaceService {
  constructor(
    private workspaceRepo: WorkspaceRepository = new WorkspaceRepository(),
    private memberRepo: WorkspaceMemberRepository = new WorkspaceMemberRepository(),
    private eventEmitter: IWorkspaceEventEmitter = new NullWorkspaceEventEmitter()
  ) {}

  /**
   * Create workspace
   *
   * Steps:
   * 1. Validate input (Zod)
   * 2. Check policy (any authenticated user can create)
   * 3. Create workspace record
   * 4. Add creator as owner member
   * 5. Emit workspace.created event
   */
  async createWorkspace(
    input: CreateWorkspaceInput,
    actorId: string
  ): Promise<Result<Workspace>> {
    // Validate input
    const validation = createWorkspaceSchema.safeParse(input);
    if (!validation.success) {
      return err(WorkspaceValidationError.fromZodIssues(validation.error.issues));
    }

    // Check policy
    const canCreate = policies.canCreateWorkspace();
    if (!canCreate.allowed) {
      return err(
        new WorkspacePermissionDeniedError('create_workspace', actorId, 'N/A', canCreate.reason)
      );
    }

    try {
      // Create workspace
      const workspace = await this.workspaceRepo.create({
        name: validation.data.name,
        slug: validation.data.slug,
        description: validation.data.description ?? null,
        logo: validation.data.logo ?? null,
        ownerId: actorId,
      });

      // Add creator as owner member
      await this.memberRepo.create({
        workspaceId: workspace.id,
        userId: actorId,
        role: 'owner',
        invitedBy: undefined,
      });

      // Emit event
      this.eventEmitter.emit(
        workspaceCreated({
          workspaceId: workspace.id,
          actorId,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
          ownerId: actorId,
        })
      );

      return ok(workspace);
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes('slug already exists')) {
        return err(new WorkspaceAlreadyExistsError(validation.data.slug));
      }
      return err(new WorkspaceInternalError('create_workspace', cause));
    }
  }

  /**
   * Get workspace by ID
   *
   * Checks: membership (can only read if member)
   * Returns: Workspace if found and accessible
   */
  async getWorkspace(workspaceId: string, actorId: string): Promise<Result<Workspace>> {
    try {
      const workspace = await this.workspaceRepo.getById(workspaceId);
      if (!workspace) {
        return err(new WorkspaceNotFoundError(workspaceId));
      }

      if (policies.isWorkspaceDeleted(workspace)) {
        return err(new WorkspaceDeletedError(workspaceId, 'read'));
      }

      const membership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, actorId);
      const canView = policies.canViewWorkspace(membership);
      if (!canView.allowed) {
        return err(
          new WorkspacePermissionDeniedError('view_workspace', actorId, workspaceId, canView.reason)
        );
      }

      return ok(workspace);
    } catch (cause) {
      return err(new WorkspaceInternalError('get_workspace', cause));
    }
  }

  /**
   * List user's workspaces
   *
   * Returns: Array of {workspace, role} tuples where user is a member
   */
  async listUserWorkspaces(
    actorId: string
  ): Promise<
    Result<
      Array<{
        readonly workspace: Workspace;
        readonly role: WorkspaceRole;
      }>
    >
  > {
    try {
      const memberships = await this.memberRepo.listByUser(actorId);
      const result: Array<{ workspace: Workspace; role: WorkspaceRole }> = [];

      for (const membership of memberships) {
        const workspace = await this.workspaceRepo.getById(membership.workspaceId);
        if (workspace && !policies.isWorkspaceDeleted(workspace)) {
          result.push({
            workspace,
            role: membership.role,
          });
        }
      }

      return ok(result);
    } catch (cause) {
      return err(new WorkspaceInternalError('list_user_workspaces', cause));
    }
  }

  /**
   * Update workspace
   *
   * Checks: actor is member AND (editor or owner)
   * Returns: Updated workspace
   */
  async updateWorkspace(
    workspaceId: string,
    input: UpdateWorkspaceInput,
    actorId: string
  ): Promise<Result<Workspace>> {
    // Validate input
    const validation = updateWorkspaceSchema.safeParse(input);
    if (!validation.success) {
      return err(WorkspaceValidationError.fromZodIssues(validation.error.issues));
    }

    try {
      const workspace = await this.workspaceRepo.getById(workspaceId);
      if (!workspace) {
        return err(new WorkspaceNotFoundError(workspaceId));
      }

      if (policies.isWorkspaceDeleted(workspace)) {
        return err(new WorkspaceDeletedError(workspaceId, 'update'));
      }

      const membership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, actorId);
      const canUpdate = policies.canUpdateWorkspace(membership);
      if (!canUpdate.allowed) {
        return err(
          new WorkspacePermissionDeniedError(
            'update_workspace',
            actorId,
            workspaceId,
            canUpdate.reason
          )
        );
      }

      // Track changed fields for event
      const changedFields: ('name' | 'description' | 'logo')[] = [];
      const previousValues: Record<string, any> = {};

      if (validation.data.name !== undefined && validation.data.name !== workspace.name) {
        changedFields.push('name');
        previousValues.name = workspace.name;
      }
      if (
        validation.data.description !== undefined &&
        validation.data.description !== workspace.description
      ) {
        changedFields.push('description');
        previousValues.description = workspace.description;
      }
      if (validation.data.logo !== undefined && validation.data.logo !== workspace.logo) {
        changedFields.push('logo');
        previousValues.logo = workspace.logo;
      }

      if (changedFields.length === 0) {
        // No changes — return unchanged workspace
        return ok(workspace);
      }

      const updated = await this.workspaceRepo.update(
        workspaceId,
        validation.data,
        actorId
      );

      this.eventEmitter.emit(
        workspaceUpdated({
          workspaceId,
          actorId,
          changedFields: changedFields as any,
          previousValues,
        })
      );

      return ok(updated);
    } catch (cause) {
      return err(new WorkspaceInternalError('update_workspace', cause));
    }
  }

  /**
   * Delete workspace (soft delete)
   *
   * Checks: actor is owner
   * Returns: Deleted workspace
   */
  async deleteWorkspace(workspaceId: string, actorId: string): Promise<Result<Workspace>> {
    try {
      const workspace = await this.workspaceRepo.getById(workspaceId);
      if (!workspace) {
        return err(new WorkspaceNotFoundError(workspaceId));
      }

      if (policies.isWorkspaceDeleted(workspace)) {
        return err(new WorkspaceDeletedError(workspaceId, 'delete'));
      }

      const membership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, actorId);
      const canDelete = policies.canDeleteWorkspace(membership);
      if (!canDelete.allowed) {
        return err(
          new WorkspacePermissionDeniedError(
            'delete_workspace',
            actorId,
            workspaceId,
            canDelete.reason
          )
        );
      }

      const deleted = await this.workspaceRepo.softDelete(workspaceId, actorId);

      this.eventEmitter.emit(
        workspaceDeleted({
          workspaceId,
          actorId,
          name: workspace.name,
          slug: workspace.slug,
        })
      );

      return ok(deleted);
    } catch (cause) {
      return err(new WorkspaceInternalError('delete_workspace', cause));
    }
  }

  /**
   * Restore soft-deleted workspace
   *
   * Checks: actor is owner (or was before deletion)
   * Returns: Restored workspace
   */
  async restoreWorkspace(workspaceId: string, actorId: string): Promise<Result<Workspace>> {
    try {
      const workspace = await this.workspaceRepo.getById(workspaceId, { includeDeleted: true });
      if (!workspace) {
        return err(new WorkspaceNotFoundError(workspaceId));
      }

      if (!policies.isWorkspaceDeleted(workspace)) {
        return err(new WorkspaceNotDeletedError(workspaceId));
      }

      // Note: membership may be soft-deleted too. For MVP, allow original owner to restore.
      // Future: require membership to be active or add explicit restore permission.
      const membership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, actorId, {
        includeDeleted: true,
      });
      const canRestore = policies.canRestoreWorkspace(membership);
      if (!canRestore.allowed) {
        return err(
          new WorkspacePermissionDeniedError(
            'restore_workspace',
            actorId,
            workspaceId,
            canRestore.reason
          )
        );
      }

      const restored = await this.workspaceRepo.restore(workspaceId, actorId);

      this.eventEmitter.emit(
        workspaceRestored({
          workspaceId,
          actorId,
          name: workspace.name,
          slug: workspace.slug,
        })
      );

      return ok(restored);
    } catch (cause) {
      return err(new WorkspaceInternalError('restore_workspace', cause));
    }
  }

  /**
   * Transfer workspace ownership
   *
   * Checks:
   * - Actor is owner
   * - Target is a different user
   * - Target is an active member
   * Returns: Updated workspace with new owner
   */
  async transferOwnership(
    workspaceId: string,
    targetUserId: string,
    actorId: string
  ): Promise<Result<Workspace>> {
    try {
      const workspace = await this.workspaceRepo.getById(workspaceId);
      if (!workspace) {
        return err(new WorkspaceNotFoundError(workspaceId));
      }

      if (policies.isWorkspaceDeleted(workspace)) {
        return err(new WorkspaceDeletedError(workspaceId, 'transfer_ownership'));
      }

      const actorMembership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, actorId);
      const targetMembership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        targetUserId
      );

      const canTransfer = policies.canTransferOwnership({
        actorMembership,
        targetMembership,
        targetUserId,
        actorId,
      });
      if (!canTransfer.allowed) {
        return err(
          new WorkspaceOwnershipTransferError(workspaceId, canTransfer.reason)
        );
      }

      const updated = await this.workspaceRepo.updateOwner(
        workspaceId,
        targetUserId,
        actorId
      );

      this.eventEmitter.emit(
        workspaceOwnershipTransferred({
          workspaceId,
          actorId,
          previousOwnerId: workspace.ownerId,
          newOwnerId: targetUserId,
        })
      );

      return ok(updated);
    } catch (cause) {
      return err(new WorkspaceInternalError('transfer_ownership', cause));
    }
  }

  /**
   * Add member to workspace
   *
   * Checks: actor is owner
   * Returns: New membership record
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole = 'viewer',
    actorId: string
  ): Promise<Result<WorkspaceMember>> {
    try {
      const workspace = await this.workspaceRepo.getById(workspaceId);
      if (!workspace) {
        return err(new WorkspaceNotFoundError(workspaceId));
      }

      if (policies.isWorkspaceDeleted(workspace)) {
        return err(new WorkspaceDeletedError(workspaceId, 'add_member'));
      }

      const membership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, actorId);
      const canInvite = policies.canInviteMembers(membership);
      if (!canInvite.allowed) {
        return err(
          new WorkspacePermissionDeniedError(
            'add_member',
            actorId,
            workspaceId,
            canInvite.reason
          )
        );
      }

      // Check if user is already a member
      const existing = await this.memberRepo.getByWorkspaceAndUser(workspaceId, userId);
      if (existing) {
        return err(new WorkspaceMembershipExistsError(workspaceId, userId));
      }

      const member = await this.memberRepo.create({
        workspaceId,
        userId,
        role,
        invitedBy: actorId,
      });

      this.eventEmitter.emit(
        workspaceMemberAdded({
          workspaceId,
          actorId,
          userId,
          role,
          invitedBy: actorId,
        })
      );

      return ok(member);
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes('already a member')) {
        return err(new WorkspaceMembershipExistsError(workspaceId, userId));
      }
      return err(new WorkspaceInternalError('add_member', cause));
    }
  }

  /**
   * Remove member from workspace
   *
   * Checks:
   * - Actor is owner
   * - Target is an active member
   * - Target is not the last owner
   * Returns: Removed membership record
   */
  async removeMember(
    workspaceId: string,
    userId: string,
    actorId: string
  ): Promise<Result<WorkspaceMember>> {
    try {
      const workspace = await this.workspaceRepo.getById(workspaceId);
      if (!workspace) {
        return err(new WorkspaceNotFoundError(workspaceId));
      }

      if (policies.isWorkspaceDeleted(workspace)) {
        return err(new WorkspaceDeletedError(workspaceId, 'remove_member'));
      }

      const actorMembership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, actorId);
      const targetMembership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, userId);
      const activeOwnerCount = (
        await this.memberRepo.list({
          workspaceId,
          role: 'owner',
          excludeDeleted: true,
        })
      ).length;

      const canRemove = policies.canRemoveMember({
        actorMembership,
        targetMembership,
        activeOwnerCount,
      });
      if (!canRemove.allowed) {
        return err(
          new WorkspacePermissionDeniedError(
            'remove_member',
            actorId,
            workspaceId,
            canRemove.reason
          )
        );
      }

      if (!targetMembership) {
        return err(new WorkspaceMemberNotFoundError(workspaceId, userId));
      }

      const removed = await this.memberRepo.remove(targetMembership.id);

      this.eventEmitter.emit(
        workspaceMemberRemoved({
          workspaceId,
          actorId,
          userId,
          role: targetMembership.role,
          selfRemoved: false,
        })
      );

      return ok(removed);
    } catch (cause) {
      return err(new WorkspaceInternalError('remove_member', cause));
    }
  }

  /**
   * Leave workspace
   *
   * Checks: actor is member AND not the last owner
   * Returns: Removed membership record
   */
  async leaveWorkspace(workspaceId: string, actorId: string): Promise<Result<WorkspaceMember>> {
    try {
      const workspace = await this.workspaceRepo.getById(workspaceId);
      if (!workspace) {
        return err(new WorkspaceNotFoundError(workspaceId));
      }

      if (policies.isWorkspaceDeleted(workspace)) {
        return err(new WorkspaceDeletedError(workspaceId, 'leave'));
      }

      const actorMembership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, actorId);
      const activeOwnerCount = (
        await this.memberRepo.list({
          workspaceId,
          role: 'owner',
          excludeDeleted: true,
        })
      ).length;

      const canLeave = policies.canLeaveWorkspace({
        actorMembership,
        activeOwnerCount,
      });
      if (!canLeave.allowed) {
        return err(
          new WorkspacePermissionDeniedError(
            'leave_workspace',
            actorId,
            workspaceId,
            canLeave.reason
          )
        );
      }

      if (!actorMembership) {
        return err(new WorkspaceMemberNotFoundError(workspaceId, actorId));
      }

      const removed = await this.memberRepo.remove(actorMembership.id);

      this.eventEmitter.emit(
        workspaceMemberRemoved({
          workspaceId,
          actorId,
          userId: actorId,
          role: actorMembership.role,
          selfRemoved: true,
        })
      );

      return ok(removed);
    } catch (cause) {
      return err(new WorkspaceInternalError('leave_workspace', cause));
    }
  }

  /**
   * Change member role
   *
   * Checks:
   * - Actor is owner
   * - Target is an active member
   * - New role is different from current
   * - Actor cannot change own role
   * Returns: Updated membership record
   */
  async changeMemberRole(
    workspaceId: string,
    userId: string,
    newRole: WorkspaceRole,
    actorId: string
  ): Promise<Result<WorkspaceMember>> {
    try {
      const workspace = await this.workspaceRepo.getById(workspaceId);
      if (!workspace) {
        return err(new WorkspaceNotFoundError(workspaceId));
      }

      if (policies.isWorkspaceDeleted(workspace)) {
        return err(new WorkspaceDeletedError(workspaceId, 'change_member_role'));
      }

      const actorMembership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, actorId);
      const targetMembership = await this.memberRepo.getByWorkspaceAndUser(workspaceId, userId);

      const canChange = policies.canChangeMemberRole({
        actorMembership,
        targetMembership,
        newRole,
      });
      if (!canChange.allowed) {
        return err(
          new WorkspacePermissionDeniedError(
            'change_member_role',
            actorId,
            workspaceId,
            canChange.reason
          )
        );
      }

      if (!targetMembership) {
        return err(new WorkspaceMemberNotFoundError(workspaceId, userId));
      }

      const updated = await this.memberRepo.update(targetMembership.id, { role: newRole });

      this.eventEmitter.emit(
        workspaceMemberRoleChanged({
          workspaceId,
          actorId,
          userId,
          previousRole: targetMembership.role,
          newRole,
        })
      );

      return ok(updated);
    } catch (cause) {
      return err(new WorkspaceInternalError('change_member_role', cause));
    }
  }
}
