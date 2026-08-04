import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Workspace roles enum
 * Defines the different roles a user can have within a workspace
 */
export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'editor', 'viewer']);

/**
 * Workspaces table
 * Represents a workspace that belongs to a user
 * Multiple users can be members of the same workspace with different roles
 */
export const workspacesTable = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    logo: varchar('logo', { length: 512 }),
    ownerId: uuid('owner_id').notNull(),
    // Settings stored as text - must be validated before insertion
    // Use application-level validation for JSON structure
    settings: text('settings').default('{}'),

    // Audit columns
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
  },
  (table) => ({
    ownerIdx: index('idx_workspace_owner_id').on(table.ownerId),
    slugIdx: index('idx_workspace_slug').on(table.slug),
  })
);

/**
 * Workspace Members table
 * Represents the membership of a user in a workspace
 * Supports multiple roles and soft delete
 */
export const workspaceMembersTable = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: workspaceRoleEnum('role').notNull().default('viewer'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    invitedBy: uuid('invited_by'),
    leftAt: timestamp('left_at', { withTimezone: true }),

    // Audit columns
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
  },
  (table) => ({
    workspaceIdIdx: index('idx_workspace_members_workspace_id').on(table.workspaceId),
    userIdIdx: index('idx_workspace_members_user_id').on(table.userId),
  })
);

// Infer types from schema
export type Workspace = typeof workspacesTable.$inferSelect;
export type CreateWorkspaceInput = typeof workspacesTable.$inferInsert;

export type WorkspaceMember = typeof workspaceMembersTable.$inferSelect;
export type CreateWorkspaceMemberInput = typeof workspaceMembersTable.$inferInsert;

export type WorkspaceRole = typeof workspaceRoleEnum.enumValues[number];
