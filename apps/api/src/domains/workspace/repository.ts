/**
 * Workspace repository
 * Data access layer for workspace-related operations
 * Handles all database queries using Drizzle ORM
 */

import { db } from '@/db/client';
import {
  workspacesTable,
  workspaceMembersTable,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceRole,
} from '@repo/database';
import { eq, and, isNull, ne } from 'drizzle-orm';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  CreateWorkspaceMemberInput,
  UpdateWorkspaceMemberInput,
  WorkspaceQueryFilters,
  WorkspaceMemberQueryFilters,
} from './workspace.types';

/**
 * Workspace Repository
 * Manages all workspace CRUD operations
 */
export class WorkspaceRepository {
  /**
   * Create a new workspace
   * @param data - Workspace creation data
   * @returns The created workspace
   * @throws Error if workspace with slug already exists or database error occurs
   */
  async create(data: CreateWorkspaceInput): Promise<Workspace> {
    // Validate required fields before database operation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Workspace name cannot be empty');
    }
    if (!data.slug || data.slug.trim().length === 0) {
      throw new Error('Workspace slug cannot be empty');
    }
    if (!data.ownerId) {
      throw new Error('Owner ID is required');
    }

    try {
      const [workspace] = await db
        .insert(workspacesTable)
        .values({
          name: data.name.trim(),
          slug: data.slug.toLowerCase().trim(),
          description: data.description?.trim() || null,
          logo: data.logo?.trim() || null,
          ownerId: data.ownerId,
          createdBy: data.ownerId,
          updatedBy: data.ownerId,
        })
        .returning();

      if (!workspace) {
        throw new Error('Failed to create workspace');
      }

      return workspace;
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505' && error.constraint === 'workspaces_slug_key') {
        throw new Error('A workspace with this slug already exists');
      }
      throw error;
    }
  }

  /**
   * Get workspace by ID
   * @param id - Workspace ID
   * @param options - Query options
   * @returns The workspace or null if not found
   */
  async getById(id: string, options?: { includeDeleted?: boolean }): Promise<Workspace | null> {
    const conditions = [eq(workspacesTable.id, id)];

    if (!options?.includeDeleted) {
      conditions.push(isNull(workspacesTable.deletedAt));
    }

    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(and(...conditions));

    return workspace || null;
  }

  /**
   * Get workspace by slug
   * @param slug - Workspace slug
   * @param options - Query options
   * @returns The workspace or null if not found
   */
  async getBySlug(slug: string, options?: { includeDeleted?: boolean }): Promise<Workspace | null> {
    const conditions = [eq(workspacesTable.slug, slug)];

    if (!options?.includeDeleted) {
      conditions.push(isNull(workspacesTable.deletedAt));
    }

    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(and(...conditions));

    return workspace || null;
  }

  /**
   * List workspaces with optional filters
   * @param filters - Query filters
   * @returns Array of workspaces
   */
  async list(filters?: WorkspaceQueryFilters): Promise<Workspace[]> {
    const conditions = [];

    if (filters?.ownerId) {
      conditions.push(eq(workspacesTable.ownerId, filters.ownerId));
    }

    if (filters?.excludeDeleted !== false) {
      conditions.push(isNull(workspacesTable.deletedAt));
    }

    return db
      .select()
      .from(workspacesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(workspacesTable.createdAt);
  }

  /**
   * Update workspace
   * @param id - Workspace ID
   * @param data - Partial workspace data to update
   * @param updatedBy - UUID of user making the update
   * @returns The updated workspace
   * @throws Error if workspace not found or already deleted
   */
  async update(id: string, data: UpdateWorkspaceInput, updatedBy: string): Promise<Workspace> {
    // Build update object only with provided fields to avoid setting undefined
    const updateData: Partial<typeof workspacesTable.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy,
    };

    // Only include fields that are explicitly provided
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.logo !== undefined) {
      updateData.logo = data.logo;
    }

    const [workspace] = await db
      .update(workspacesTable)
      .set(updateData)
      .where(and(eq(workspacesTable.id, id), isNull(workspacesTable.deletedAt)))
      .returning();

    if (!workspace) {
      throw new Error(`Workspace with ID ${id} not found or already deleted`);
    }

    return workspace;
  }

  /**
   * Soft delete workspace
   * @param id - Workspace ID
   * @param deletedBy - UUID of user deleting the workspace
   * @returns The deleted workspace
   */
  async softDelete(id: string, deletedBy: string): Promise<Workspace> {
    const [workspace] = await db
      .update(workspacesTable)
      .set({
        deletedAt: new Date(),
        updatedBy: deletedBy,
        updatedAt: new Date(),
      })
      .where(and(eq(workspacesTable.id, id), isNull(workspacesTable.deletedAt)))
      .returning();

    if (!workspace) {
      throw new Error(`Workspace with ID ${id} not found`);
    }

    return workspace;
  }

  /**
   * Restore soft-deleted workspace
   * @param id - Workspace ID
   * @param restoredBy - UUID of user restoring the workspace
   * @returns The restored workspace
   */
  async restore(id: string, restoredBy: string): Promise<Workspace> {
    const [workspace] = await db
      .update(workspacesTable)
      .set({
        deletedAt: null,
        updatedBy: restoredBy,
        updatedAt: new Date(),
      })
      .where(and(eq(workspacesTable.id, id), ne(workspacesTable.deletedAt, null)))
      .returning();

    if (!workspace) {
      throw new Error(`Deleted workspace with ID ${id} not found`);
    }

    return workspace;
  }

  /**
   * Check if workspace exists and is active
   * @param id - Workspace ID
   * @returns true if workspace exists and is not deleted
   */
  async exists(id: string): Promise<boolean> {
    const [workspace] = await db
      .select({ id: workspacesTable.id })
      .from(workspacesTable)
      .where(and(eq(workspacesTable.id, id), isNull(workspacesTable.deletedAt)))
      .limit(1);

    return !!workspace;
  }
}

/**
 * Workspace Members Repository
 * Manages workspace membership operations
 */
export class WorkspaceMemberRepository {
  /**
   * Add member to workspace
   * @param data - Workspace member creation data
   * @returns The created membership record
   * @throws Error if invalid input or duplicate membership
   */
  async create(data: CreateWorkspaceMemberInput): Promise<WorkspaceMember> {
    // Validate required fields
    if (!data.workspaceId) {
      throw new Error('Workspace ID is required');
    }
    if (!data.userId) {
      throw new Error('User ID is required');
    }

    try {
      const [member] = await db
        .insert(workspaceMembersTable)
        .values({
          workspaceId: data.workspaceId,
          userId: data.userId,
          role: data.role || 'viewer',
          invitedBy: data.invitedBy || null,
        })
        .returning();

      if (!member) {
        throw new Error('Failed to create workspace member');
      }

      return member;
    } catch (error: any) {
      // Handle unique constraint violation (duplicate membership)
      if (error.code === '23505' && error.constraint === 'workspace_members_unique') {
        throw new Error('User is already a member of this workspace');
      }
      // Handle foreign key violation
      if (error.code === '23503') {
        throw new Error('Workspace or user does not exist');
      }
      throw error;
    }
  }

  /**
   * Get member by ID
   * @param id - Member ID
   * @param options - Query options
   * @returns The member or null if not found
   */
  async getById(id: string, options?: { includeDeleted?: boolean }): Promise<WorkspaceMember | null> {
    const conditions = [eq(workspaceMembersTable.id, id)];

    if (!options?.includeDeleted) {
      conditions.push(isNull(workspaceMembersTable.deletedAt));
    }

    const [member] = await db
      .select()
      .from(workspaceMembersTable)
      .where(and(...conditions));

    return member || null;
  }

  /**
   * Get member by workspace and user ID
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @param options - Query options
   * @returns The member or null if not found
   */
  async getByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<WorkspaceMember | null> {
    const conditions = [
      eq(workspaceMembersTable.workspaceId, workspaceId),
      eq(workspaceMembersTable.userId, userId),
    ];

    if (!options?.includeDeleted) {
      conditions.push(isNull(workspaceMembersTable.deletedAt));
    }

    const [member] = await db
      .select()
      .from(workspaceMembersTable)
      .where(and(...conditions));

    return member || null;
  }

  /**
   * List workspace members with optional filters
   * @param filters - Query filters
   * @returns Array of members
   */
  async list(filters?: WorkspaceMemberQueryFilters): Promise<WorkspaceMember[]> {
    const conditions = [];

    if (filters?.workspaceId) {
      conditions.push(eq(workspaceMembersTable.workspaceId, filters.workspaceId));
    }

    if (filters?.userId) {
      conditions.push(eq(workspaceMembersTable.userId, filters.userId));
    }

    if (filters?.role) {
      conditions.push(eq(workspaceMembersTable.role, filters.role));
    }

    if (filters?.excludeDeleted !== false) {
      conditions.push(isNull(workspaceMembersTable.deletedAt));
    }

    return db
      .select()
      .from(workspaceMembersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(workspaceMembersTable.joinedAt);
  }

  /**
   * Get all workspaces for a user
   * @param userId - User ID
   * @returns Array of workspace members for this user
   */
  async listByUser(userId: string): Promise<WorkspaceMember[]> {
    return this.list({ userId, excludeDeleted: true });
  }

  /**
   * Get all members in a workspace
   * @param workspaceId - Workspace ID
   * @returns Array of members in this workspace
   */
  async listByWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.list({ workspaceId, excludeDeleted: true });
  }

  /**
   * Update member role
   * @param id - Member ID
   * @param data - Update data
   * @returns The updated member
   * @throws Error if member not found or already deleted
   */
  async update(id: string, data: UpdateWorkspaceMemberInput): Promise<WorkspaceMember> {
    // Only update role if explicitly provided
    if (data.role === undefined) {
      const [member] = await db
        .select()
        .from(workspaceMembersTable)
        .where(and(eq(workspaceMembersTable.id, id), isNull(workspaceMembersTable.deletedAt)));

      if (!member) {
        throw new Error(`Member with ID ${id} not found or already deleted`);
      }

      return member;
    }

    const [member] = await db
      .update(workspaceMembersTable)
      .set({
        role: data.role,
        updatedAt: new Date(),
      })
      .where(and(eq(workspaceMembersTable.id, id), isNull(workspaceMembersTable.deletedAt)))
      .returning();

    if (!member) {
      throw new Error(`Member with ID ${id} not found or already deleted`);
    }

    return member;
  }

  /**
   * Remove member from workspace (soft delete)
   * @param id - Member ID
   * @returns The removed member
   */
  async remove(id: string): Promise<WorkspaceMember> {
    const [member] = await db
      .update(workspaceMembersTable)
      .set({
        deletedAt: new Date(),
        leftAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(workspaceMembersTable.id, id), isNull(workspaceMembersTable.deletedAt)))
      .returning();

    if (!member) {
      throw new Error(`Member with ID ${id} not found or already removed`);
    }

    return member;
  }

  /**
   * Check if user is member of workspace
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @returns true if user is an active member
   */
  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select({ id: workspaceMembersTable.id })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, userId),
          isNull(workspaceMembersTable.deletedAt)
        )
      )
      .limit(1);

    return !!member;
  }

  /**
   * Get user role in workspace
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @returns The user's role or null if not a member
   */
  async getUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const [member] = await db
      .select({ role: workspaceMembersTable.role })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, userId),
          isNull(workspaceMembersTable.deletedAt)
        )
      );

    return member?.role || null;
  }

  /**
   * Count active members in workspace
   * @param workspaceId - Workspace ID
   * @returns Number of active members
   */
  async countMembers(workspaceId: string): Promise<number> {
    // Import count helper (add at top of file if not present)
    const result = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          isNull(workspaceMembersTable.deletedAt)
        )
      );

    return result.length;
  }
}
