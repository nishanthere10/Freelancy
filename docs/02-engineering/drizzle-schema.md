# Drizzle ORM Schema Reference

**Version:** 2.0  
**Last Updated:** August 2, 2026  
**Status:** Production Ready (Updated)  
**Owner:** Engineering Team

---

## Overview

This document provides the complete Drizzle ORM schema for Freelance OS. It serves as a reference for engineers implementing database operations and relationships.

**Key Changes (v2.0):**
- Added Workspace and WorkspaceMember entities for multi-tenant support
- Added Client entity with proper relationships
- Projects now belong to Client (and therefore to Workspace)
- Split AI conversations from long-term AI memory into separate tables
- Made Scope Analysis versioned (1:N relationship instead of 1:1)
- Using pgEnum() for status fields
- Added dedicated Payment table instead of embedding in invoices
- Added Requirement and ChangeRequest entities

**Related documents:**
- `database.md` - Technology choices and ORM selection
- `database-design.md` - Normalization strategy and relationships
- `event-model.md` - Event sourcing architecture

---

## 1. Directory Structure

```
packages/database/
├── src/
│   ├── schema/
│   │   ├── index.ts                  # Export all tables and relations
│   │   ├── enums.ts                  # Shared pgEnum definitions
│   │   ├── users.ts                  # User entities
│   │   ├── workspaces.ts             # Workspace & WorkspaceMember
│   │   ├── clients.ts                # Client entities
│   │   ├── projects.ts               # Project entities
│   │   ├── requirements.ts           # Requirement entities
│   │   ├── scope-analysis.ts         # Versioned scope analysis
│   │   ├── change-requests.ts        # Change request tracking
│   │   ├── invoices.ts               # Invoice entities
│   │   ├── payments.ts               # Payment records (separate)
│   │   ├── ai-conversations.ts       # Short-term AI chat history
│   │   ├── ai-memory.ts              # Long-term AI learning storage
│   │   ├── milestones.ts             # Milestone entities
│   │   └── migrations/
│   │       ├── 001_init_enums.sql
│   │       ├── 002_init_core.sql
│   │       ├── 003_add_projects.sql
│   │       ├── 004_add_invoices.sql
│   │       └── 005_add_ai.sql
│   └── migrations.ts                 # Migration runner
├── tsconfig.json
└── package.json
```

---

## 2. Enums Schema

```typescript
// packages/database/src/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Enum definitions using pgEnum for strict type safety
 */

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'workspace_owner',
  'workspace_member',
  'client',
]);

export const workspaceRoleEnum = pgEnum('workspace_role', [
  'owner',
  'editor',
  'viewer',
]);

export const projectStatusEnum = pgEnum('project_status', [
  'planning',
  'active',
  'paused',
  'completed',
  'cancelled',
  'archived',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'viewed',
  'paid',
  'overdue',
  'disputed',
  'cancelled',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'successful',
  'failed',
  'refunded',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'upi',
  'bank_transfer',
  'credit_card',
  'debit_card',
  'other',
]);

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'cancelled',
]);

export const requirementStatusEnum = pgEnum('requirement_status', [
  'draft',
  'proposed',
  'accepted',
  'in_progress',
  'completed',
  'rejected',
  'deprecated',
]);

export const changeRequestStatusEnum = pgEnum('change_request_status', [
  'draft',
  'proposed',
  'accepted',
  'rejected',
  'in_progress',
  'completed',
]);

export const changeRequestImpactEnum = pgEnum('change_request_impact', [
  'low',
  'medium',
  'high',
  'critical',
]);
```

---

## 3. Users Schema

```typescript
// packages/database/src/schema/users.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userRoleEnum } from './enums';

/**
 * Users table
 * Stores user account information (freelancers, clients, admins)
 */
export const usersTable = pgTable('users', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Account Info
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  
  // Role (for platform-level access)
  role: userRoleEnum('role').notNull().default('workspace_member'),

  // Profile
  avatar: text('avatar'),  // URL to avatar image
  bio: text('bio'),

  // GST Registration (India-specific)
  gstRegistered: text('gst_registered').notNull().default('no'),  // 'yes' | 'no'
  gstNumber: text('gst_number'),  // NULL if not registered

  // Audit Columns
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),  // Soft delete
});

/**
 * Type inference for Users
 */
export type User = typeof usersTable.$inferSelect;
export type CreateUserInput = typeof usersTable.$inferInsert;

/**
 * User relations
 */
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  // Workspaces
  workspaceMembers: many(workspaceMembersTable),
  
  // Projects (as project owner)
  projects: many(projectsTable),
  
  // Invoices
  invoices: many(invoicesTable),
  payments: many(paymentsTable),
  
  // AI
  aiConversations: many(aiConversationsTable),
  aiMemories: many(aiMemoriesTable),
  
  // Requirements
  requirements: many(requirementsTable),
  
  // Change Requests
  changeRequests: many(changeRequestsTable),
}));
```

---

## 4. Workspace Schema

```typescript
// packages/database/src/schema/workspaces.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersTable } from './users';
import { workspaceRoleEnum } from './enums';

/**
 * Workspaces table
 * Represents a workspace (team/organization)
 */
export const workspacesTable = pgTable(
  'workspaces',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Workspace Info
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    logo: text('logo'),  // URL to logo

    // Owner (foreign key to users)
    ownerId: uuid('owner_id').notNull(),

    // Settings
    settings: text('settings').default('{}'),  // JSON: billing preferences, etc.

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',
    }),
    index('idx_workspaces_owner_id').on(table.ownerId),
    index('idx_workspaces_slug').on(table.slug),
  ]
);

export type Workspace = typeof workspacesTable.$inferSelect;
export type CreateWorkspaceInput = typeof workspacesTable.$inferInsert;

export const workspacesRelations = relations(
  workspacesTable,
  ({ one, many }) => ({
    owner: one(usersTable, {
      fields: [workspacesTable.ownerId],
      references: [usersTable.id],
    }),
    members: many(workspaceMembersTable),
    clients: many(clientsTable),
    projects: many(projectsTable),
  })
);

/**
 * WorkspaceMembers table
 * Maps users to workspaces with roles
 */
export const workspaceMembersTable = pgTable(
  'workspace_members',
  {
    // Primary Key (composite)
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Role within workspace
    role: workspaceRoleEnum('role').notNull().default('viewer'),

    // Metadata
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    invitedBy: uuid('invited_by'),
    leftAt: timestamp('left_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',
    }),
    index('idx_workspace_members_workspace').on(table.workspaceId),
    index('idx_workspace_members_user').on(table.userId),
    index('idx_workspace_members_unique').on(table.workspaceId, table.userId),
  ]
);

export type WorkspaceMember = typeof workspaceMembersTable.$inferSelect;
export type CreateWorkspaceMemberInput =
  typeof workspaceMembersTable.$inferInsert;

export const workspaceMembersRelations = relations(
  workspaceMembersTable,
  ({ one }) => ({
    workspace: one(workspacesTable, {
      fields: [workspaceMembersTable.workspaceId],
      references: [workspacesTable.id],
    }),
    user: one(usersTable, {
      fields: [workspaceMembersTable.userId],
      references: [usersTable.id],
    }),
  })
);
```

---

## 5. Client Schema

```typescript
// packages/database/src/schema/clients.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workspacesTable } from './workspaces';

/**
 * Clients table
 * Represents client organizations or individuals
 * Belongs to a Workspace
 */
export const clientsTable = pgTable(
  'clients',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Key
    workspaceId: uuid('workspace_id').notNull(),

    // Client Info
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    website: text('website'),

    // Address (India-specific)
    address: text('address'),
    city: text('city'),
    state: text('state'),
    postalCode: text('postal_code'),
    country: text('country').default('IN'),

    // Company Info
    companyName: text('company_name'),
    gstNumber: text('gst_number'),  // Client's GST number (for B2B invoicing)

    // Contact Info
    contactPerson: text('contact_person'),
    department: text('department'),

    // Status
    status: text('status').notNull().default('active'),  // 'active' | 'inactive' | 'archived'

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      onDelete: 'cascade',
    }),
    index('idx_clients_workspace_id').on(table.workspaceId),
    index('idx_clients_email').on(table.email),
  ]
);

export type Client = typeof clientsTable.$inferSelect;
export type CreateClientInput = typeof clientsTable.$inferInsert;
export type UpdateClientInput = Partial<CreateClientInput>;

export const clientsRelations = relations(clientsTable, ({ one, many }) => ({
  workspace: one(workspacesTable, {
    fields: [clientsTable.workspaceId],
    references: [workspacesTable.id],
  }),
  projects: many(projectsTable),
}));
```

---

## 6. Projects Schema

```typescript
// packages/database/src/schema/projects.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations, eq, isNull } from 'drizzle-orm';
import { usersTable } from './users';
import { workspacesTable } from './workspaces';
import { clientsTable } from './clients';
import { projectStatusEnum } from './enums';

/**
 * Projects table
 * Stores freelance project information
 * Projects belong to a Client (and therefore to a Workspace)
 */
export const projectsTable = pgTable(
  'projects',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    workspaceId: uuid('workspace_id').notNull(),  // Project's workspace
    clientId: uuid('client_id').notNull(),  // Client (implies workspace)
    userId: uuid('user_id').notNull(),  // Project owner (freelancer)

    // Project Information
    title: text('title').notNull(),
    description: text('description').notNull(),
    
    // Financial
    budget: numeric('budget', { precision: 12, scale: 2 }).notNull(),
    
    // Status using pgEnum
    status: projectStatusEnum('status').notNull().default('planning'),

    // Timeline
    startDate: timestamp('start_date', { withTimezone: true }),
    estimatedEndDate: timestamp('estimated_end_date', { withTimezone: true }),
    actualEndDate: timestamp('actual_end_date', { withTimezone: true }),

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [clientsTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',
    }),
    index('idx_projects_workspace_id').on(table.workspaceId),
    index('idx_projects_client_id').on(table.clientId),
    index('idx_projects_user_id').on(table.userId),
    index('idx_projects_status').on(table.status),
    index('idx_projects_active').on(table.userId).where(isNull(table.deletedAt)),
  ]
);

export type Project = typeof projectsTable.$inferSelect;
export type CreateProjectInput = typeof projectsTable.$inferInsert;
export type UpdateProjectInput = Partial<CreateProjectInput>;

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  workspace: one(workspacesTable, {
    fields: [projectsTable.workspaceId],
    references: [workspacesTable.id],
  }),
  client: one(clientsTable, {
    fields: [projectsTable.clientId],
    references: [clientsTable.id],
  }),
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
  milestones: many(milestonesTable),
  invoices: many(invoicesTable),
  scopeAnalysisVersions: many(scopeAnalysisTable),  // Multiple versions
  requirements: many(requirementsTable),
  changeRequests: many(changeRequestsTable),
  aiConversations: many(aiConversationsTable),
  aiMemories: many(aiMemoriesTable),
}));
```

---

## 7. Requirements Schema

```typescript
// packages/database/src/schema/requirements.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from './projects';
import { usersTable } from './users';
import { requirementStatusEnum } from './enums';

/**
 * Requirements table
 * Tracks project requirements broken down from scope analysis
 */
export const requirementsTable = pgTable(
  'requirements',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    projectId: uuid('project_id').notNull(),
    createdBy: uuid('created_by').notNull(),

    // Requirement Details
    title: text('title').notNull(),
    description: text('description').notNull(),

    // Requirement Type
    type: text('type').notNull(),  // 'functional' | 'non_functional' | 'technical' | 'business'

    // Priority & Sequencing
    priority: integer('priority').default(0),  // 0=lowest, 10=highest
    order: integer('order').notNull(),  // Display order

    // Acceptance Criteria
    acceptanceCriteria: text('acceptance_criteria'),  // JSON or plaintext

    // Status
    status: requirementStatusEnum('status').notNull().default('draft'),

    // Relationships
    parentId: uuid('parent_id'),  // For hierarchical requirements
    linkedToChangeRequestId: uuid('linked_to_change_request_id'),

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [usersTable.id],
      onDelete: 'restrict',
    }),
    index('idx_requirements_project_id').on(table.projectId),
    index('idx_requirements_status').on(table.status),
    index('idx_requirements_order').on(table.projectId, table.order),
  ]
);

export type Requirement = typeof requirementsTable.$inferSelect;
export type CreateRequirementInput = typeof requirementsTable.$inferInsert;

export const requirementsRelations = relations(
  requirementsTable,
  ({ one, many }) => ({
    project: one(projectsTable, {
      fields: [requirementsTable.projectId],
      references: [projectsTable.id],
    }),
    creator: one(usersTable, {
      fields: [requirementsTable.createdBy],
      references: [usersTable.id],
    }),
    children: many(requirementsTable),
  })
);
```

---

## 8. Scope Analysis Schema (Versioned)

```typescript
// packages/database/src/schema/scope-analysis.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  foreignKey,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from './projects';
import { usersTable } from './users';

/**
 * Scope Analysis table (Versioned)
 * Stores AI-generated scope analysis with version tracking
 * One project can have multiple versions (1:N relationship)
 * Latest version represents current scope
 */
export const scopeAnalysisTable = pgTable(
  'scope_analyses',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    projectId: uuid('project_id').notNull(),
    createdBy: uuid('created_by').notNull(),

    // Version Management
    version: integer('version').notNull(),  // 1, 2, 3, ...
    isLatest: text('is_latest').notNull().default('true'),  // 'true' | 'false'

    // Analysis Content
    requirements: jsonb('requirements').notNull(),
    // Format: [
    //   { id, title, description, type, priority },
    //   ...
    // ]

    deliverables: jsonb('deliverables').notNull(),
    // Format: [
    //   { id, name, description, acceptance_criteria },
    //   ...
    // ]

    risks: jsonb('risks').notNull().default('[]'),
    // Format: [
    //   {
    //     id,
    //     category: "scope|timeline|technical|dependency|resource",
    //     severity: "low|medium|high|critical",
    //     description,
    //     mitigation
    //   },
    //   ...
    // ]

    assumptions: jsonb('assumptions').default('[]'),
    // Format: [{ id, description, owner, validated }]

    constraints: jsonb('constraints').default('[]'),
    // Format: [{ id, description, impact }]

    // Timeline Estimate (in days)
    timelineEstimate: numeric('timeline_estimate', { precision: 8, scale: 2 }),
    
    // Effort Estimate (in person-days)
    effortEstimate: numeric('effort_estimate', { precision: 8, scale: 2 }),

    // Confidence Score (0-1)
    confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),

    // Reasoning (why/how analysis was done)
    reasoning: text('reasoning'),

    // AI Model used
    modelUsed: text('model_used'),  // 'claude-3.5-sonnet', etc.

    // Change from previous version
    changeReason: text('change_reason'),  // Why was a new version created?

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [usersTable.id],
      onDelete: 'restrict',
    }),
    index('idx_scope_analyses_project_id').on(table.projectId),
    index('idx_scope_analyses_latest').on(table.projectId, table.isLatest),
    index('idx_scope_analyses_version')
      .on(table.projectId, table.version),
  ]
);

export type ScopeAnalysis = typeof scopeAnalysisTable.$inferSelect;
export type CreateScopeAnalysisInput = typeof scopeAnalysisTable.$inferInsert;

export const scopeAnalysisRelations = relations(
  scopeAnalysisTable,
  ({ one }) => ({
    project: one(projectsTable, {
      fields: [scopeAnalysisTable.projectId],
      references: [projectsTable.id],
    }),
    creator: one(usersTable, {
      fields: [scopeAnalysisTable.createdBy],
      references: [usersTable.id],
    }),
  })
);
```

---

## 9. Change Request Schema

```typescript
// packages/database/src/schema/change-requests.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  foreignKey,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from './projects';
import { usersTable } from './users';
import {
  changeRequestStatusEnum,
  changeRequestImpactEnum,
} from './enums';

/**
 * Change Requests table
 * Tracks scope changes and change orders
 */
export const changeRequestsTable = pgTable(
  'change_requests',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    projectId: uuid('project_id').notNull(),
    requestedBy: uuid('requested_by').notNull(),
    approvedBy: uuid('approved_by'),

    // Change Details
    title: text('title').notNull(),
    description: text('description').notNull(),

    // Impact Assessment
    impact: changeRequestImpactEnum('impact').notNull().default('medium'),
    
    timelineImpactDays: numeric('timeline_impact_days', {
      precision: 8,
      scale: 2,
    }),
    budgetImpact: numeric('budget_impact', { precision: 12, scale: 2 }),

    // Change Justification
    justification: text('justification'),
    
    // Alternative Approaches
    alternatives: jsonb('alternatives').default('[]'),
    // Format: [{ id, description, pros, cons, estimated_effort }]

    // Status
    status: changeRequestStatusEnum('status').notNull().default('draft'),

    // Approval Info
    approvalNotes: text('approval_notes'),
    rejectionReason: text('rejection_reason'),

    // Related Requirements (JSON array of requirement IDs)
    affectedRequirementIds: jsonb('affected_requirement_ids').default('[]'),

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.requestedBy],
      foreignColumns: [usersTable.id],
      onDelete: 'restrict',
    }),
    foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [usersTable.id],
      onDelete: 'restrict',
    }),
    index('idx_change_requests_project_id').on(table.projectId),
    index('idx_change_requests_status').on(table.status),
    index('idx_change_requests_impact').on(table.impact),
  ]
);

export type ChangeRequest = typeof changeRequestsTable.$inferSelect;
export type CreateChangeRequestInput = typeof changeRequestsTable.$inferInsert;

export const changeRequestsRelations = relations(
  changeRequestsTable,
  ({ one }) => ({
    project: one(projectsTable, {
      fields: [changeRequestsTable.projectId],
      references: [projectsTable.id],
    }),
    requestedByUser: one(usersTable, {
      fields: [changeRequestsTable.requestedBy],
      references: [usersTable.id],
    }),
    approvedByUser: one(usersTable, {
      fields: [changeRequestsTable.approvedBy],
      references: [usersTable.id],
    }),
  })
);
```

---

## 10. Milestones Schema

```typescript
// packages/database/src/schema/milestones.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from './projects';

/**
 * Milestones table
 * Tracks project milestones and deliverables
 */
export const milestonesTable = pgTable(
  'milestones',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    projectId: uuid('project_id').notNull(),

    // Milestone Information
    title: text('title').notNull(),
    description: text('description'),

    // Sequence (order in project)
    order: integer('order').notNull(),

    // Timeline
    dueDate: timestamp('due_date', { withTimezone: true }),

    // Status: 'pending' | 'in_progress' | 'completed'
    status: text('status').notNull().default('pending'),

    // Deliverables (JSON array)
    deliverables: text('deliverables').default('[]'),
    // Stored as JSON string: ["deliverable1", "deliverable2"]

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    index('idx_milestones_project_id').on(table.projectId),
  ]
);

export type Milestone = typeof milestonesTable.$inferSelect;
export type CreateMilestoneInput = typeof milestonesTable.$inferInsert;

export const milestonesRelations = relations(milestonesTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [milestonesTable.projectId],
    references: [projectsTable.id],
  }),
}));
```

```typescript
// packages/database/src/schema/milestones.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from './projects';
import { milestoneStatusEnum } from './enums';

/**
 * Milestones table
 * Tracks project milestones and deliverables
 */
export const milestonesTable = pgTable(
  'milestones',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    projectId: uuid('project_id').notNull(),

    // Milestone Information
    title: text('title').notNull(),
    description: text('description'),

    // Sequence (order in project)
    order: integer('order').notNull(),

    // Timeline
    dueDate: timestamp('due_date', { withTimezone: true }),

    // Status using pgEnum
    status: milestoneStatusEnum('status').notNull().default('pending'),

    // Deliverables (stored as JSON array)
    // MVP: Keep as JSONB
    // Future: Consider moving to separate Deliverables table if needed
    deliverables: text('deliverables').default('[]'),
    // Stored as JSON string: ["deliverable1", "deliverable2"]
    // Format: [{ id, name, description, acceptance_criteria, completed }]

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    index('idx_milestones_project_id').on(table.projectId),
    index('idx_milestones_status').on(table.status),
  ]
);

export type Milestone = typeof milestonesTable.$inferSelect;
export type CreateMilestoneInput = typeof milestonesTable.$inferInsert;

export const milestonesRelations = relations(milestonesTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [milestonesTable.projectId],
    references: [projectsTable.id],
  }),
}));
```

---

## 11. Invoices Schema

```typescript
// packages/database/src/schema/invoices.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersTable } from './users';
import { projectsTable } from './projects';

/**
 * Invoices table
 * Stores invoice information for billing
 */
export const invoicesTable = pgTable(
  'invoices',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Invoice Information
    invoiceNumber: text('invoice_number').notNull().unique(),
    // Format: INV-2026-001, INV-2026-002, etc.

    // Financial (all in INR)
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    gstAmount: numeric('gst_amount', { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    // totalAmount = amount + gstAmount

    // Status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'disputed'
    status: text('status').notNull().default('draft'),

    // Payment Tracking
    dueDate: timestamp('due_date', { withTimezone: true }),
    paidDate: timestamp('paid_date', { withTimezone: true }),
    paymentMethod: text('payment_method'),  // 'upi' | 'bank_transfer'
    transactionId: text('transaction_id'),

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',
    }),
    index('idx_invoices_project_id').on(table.projectId),
    index('idx_invoices_user_id').on(table.userId),
    index('idx_invoices_status').on(table.status),
    index('idx_invoices_user_status').on(table.userId, table.status),
  ]
);

export type Invoice = typeof invoicesTable.$inferSelect;
export type CreateInvoiceInput = typeof invoicesTable.$inferInsert;

export const invoicesRelations = relations(invoicesTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [invoicesTable.projectId],
    references: [projectsTable.id],
  }),
  user: one(usersTable, {
    fields: [invoicesTable.userId],
    references: [usersTable.id],
  }),
}));
```

```typescript
// packages/database/src/schema/invoices.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersTable } from './users';
import { projectsTable } from './projects';
import { invoiceStatusEnum } from './enums';

/**
 * Invoices table
 * Stores invoice information for billing
 * Payment details moved to separate Payment table
 */
export const invoicesTable = pgTable(
  'invoices',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Invoice Information
    invoiceNumber: text('invoice_number').notNull().unique(),
    // Format: INV-2026-001, INV-2026-002, etc.

    // Financial (all in INR)
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    gstAmount: numeric('gst_amount', { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    // totalAmount = amount + gstAmount

    // Line Items (stored as JSON)
    lineItems: text('line_items').default('[]'),
    // Format: [
    //   { id, description, amount, quantity, unit },
    //   ...
    // ]

    // Status using pgEnum
    status: invoiceStatusEnum('status').notNull().default('draft'),

    // Due Date
    dueDate: timestamp('due_date', { withTimezone: true }),

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',
    }),
    index('idx_invoices_project_id').on(table.projectId),
    index('idx_invoices_user_id').on(table.userId),
    index('idx_invoices_status').on(table.status),
    index('idx_invoices_user_status').on(table.userId, table.status),
  ]
);

export type Invoice = typeof invoicesTable.$inferSelect;
export type CreateInvoiceInput = typeof invoicesTable.$inferInsert;

export const invoicesRelations = relations(invoicesTable, ({ one, many }) => ({
  project: one(projectsTable, {
    fields: [invoicesTable.projectId],
    references: [projectsTable.id],
  }),
  user: one(usersTable, {
    fields: [invoicesTable.userId],
    references: [usersTable.id],
  }),
  payments: many(paymentsTable),
}));
```

---

## 12. Payments Schema (Dedicated)

```typescript
// packages/database/src/schema/payments.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersTable } from './users';
import { invoicesTable } from './invoices';
import { paymentStatusEnum, paymentMethodEnum } from './enums';

/**
 * Payments table
 * Tracks payment records separate from invoices
 * One invoice can have multiple partial payments
 */
export const paymentsTable = pgTable(
  'payments',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    invoiceId: uuid('invoice_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Payment Amount
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),

    // Status using pgEnum
    status: paymentStatusEnum('status').notNull().default('pending'),

    // Payment Method using pgEnum
    paymentMethod: paymentMethodEnum('payment_method').notNull(),

    // Payment Details
    transactionId: text('transaction_id').unique(),
    referenceNumber: text('reference_number'),  // Invoice number for bank transfer
    
    // Payment Gateway (if applicable)
    provider: text('provider'),  // 'razorpay' | 'stripe' | 'manual'
    providerTransactionId: text('provider_transaction_id'),
    webhookEventId: text('webhook_event_id'),

    // Metadata
    notes: text('notes'),
    failureReason: text('failure_reason'),  // If payment failed

    // Refund Info
    refundedAmount: numeric('refunded_amount', { precision: 12, scale: 2 }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    refundReason: text('refund_reason'),

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoicesTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'restrict',
    }),
    index('idx_payments_invoice_id').on(table.invoiceId),
    index('idx_payments_user_id').on(table.userId),
    index('idx_payments_status').on(table.status),
    index('idx_payments_transaction_id').on(table.transactionId),
    index('idx_payments_created').on(table.createdAt),
  ]
);

export type Payment = typeof paymentsTable.$inferSelect;
export type CreatePaymentInput = typeof paymentsTable.$inferInsert;

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  invoice: one(invoicesTable, {
    fields: [paymentsTable.invoiceId],
    references: [invoicesTable.id],
  }),
  user: one(usersTable, {
    fields: [paymentsTable.userId],
    references: [usersTable.id],
  }),
}));
```

---

## 13. AI Conversations Schema (Short-term)

```typescript
// packages/database/src/schema/scope-analysis.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  foreignKey,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from './projects';

/**
 * Scope Analysis table
 * Stores AI-generated scope analysis
 */
export const scopeAnalysisTable = pgTable(
  'scope_analyses',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Key (1:1 with projects)
    projectId: uuid('project_id').notNull().unique(),

    // Requirements (JSON array)
    requirements: jsonb('requirements').notNull(),
    // Format: ["Requirement 1", "Requirement 2", ...]

    // Deliverables (JSON array)
    deliverables: jsonb('deliverables').notNull(),
    // Format: ["Deliverable 1", "Deliverable 2", ...]

    // Risks (JSON array of objects)
    risks: jsonb('risks').notNull().default('[]'),
    // Format: [
    //   { category: "scope", severity: "high", description: "..." },
    //   ...
    // ]

    // Timeline Estimate (in days)
    timelineEstimate: numeric('timeline_estimate', { precision: 8, scale: 2 }),

    // Confidence Score (0-1)
    confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),

    // Version (for tracking analysis iterations)
    version: numeric('version').default(1),

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    index('idx_scope_analyses_project_id').on(table.projectId),
  ]
);

export type ScopeAnalysis = typeof scopeAnalysisTable.$inferSelect;
export type CreateScopeAnalysisInput = typeof scopeAnalysisTable.$inferInsert;

export const scopeAnalysisRelations = relations(
  scopeAnalysisTable,
  ({ one }) => ({
    project: one(projectsTable, {
      fields: [scopeAnalysisTable.projectId],
      references: [projectsTable.id],
    }),
  })
);
```

```typescript
// packages/database/src/schema/ai-conversations.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  foreignKey,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from './projects';
import { usersTable } from './users';

/**
 * AI Conversations table (Short-term memory)
 * Stores chat history and conversation context
 * Split from long-term AI memory for better performance
 * Typically kept for 30-90 days, then archived
 */
export const aiConversationsTable = pgTable(
  'ai_conversations',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Conversation Metadata
    conversationId: uuid('conversation_id').notNull(),  // Groups related messages
    messageIndex: numeric('message_index'),  // Order in conversation

    // Message Content
    role: text('role').notNull(),  // 'user' | 'assistant'
    content: text('content').notNull(),

    // Message Type/Purpose
    messageType: text('message_type'),
    // 'scope_analysis_request',
    // 'scope_analysis_response',
    // 'risk_detection',
    // 'clarification_question',
    // 'user_feedback',
    // etc.

    // AI Model Info
    modelUsed: text('model_used'),
    tokensUsed: numeric('tokens_used'),
    costEstimate: numeric('cost_estimate', { precision: 8, scale: 6 }),

    // Context
    context: jsonb('context').default('{}'),
    // Relevant data at time of message: project state, requirements, etc.

    // Feedback (for training)
    userFeedback: text('user_feedback'),  // 'thumbs_up' | 'thumbs_down' | null
    feedbackNotes: text('feedback_notes'),

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),  // When moved to memory
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',
    }),
    index('idx_ai_conversations_conversation_id').on(
      table.conversationId
    ),
    index('idx_ai_conversations_project_id').on(table.projectId),
    index('idx_ai_conversations_user_id').on(table.userId),
    index('idx_ai_conversations_created').on(table.createdAt),
    index('idx_ai_conversations_message_order')
      .on(table.conversationId, table.messageIndex),
  ]
);

export type AiConversation = typeof aiConversationsTable.$inferSelect;
export type CreateAiConversationInput = typeof aiConversationsTable.$inferInsert;

export const aiConversationsRelations = relations(
  aiConversationsTable,
  ({ one }) => ({
    project: one(projectsTable, {
      fields: [aiConversationsTable.projectId],
      references: [projectsTable.id],
    }),
    user: one(usersTable, {
      fields: [aiConversationsTable.userId],
      references: [usersTable.id],
    }),
  })
);
```

---

## 14. AI Memory Schema (Long-term)

```typescript
// packages/database/src/schema/ai-memory.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from './projects';
import { usersTable } from './users';

/**
 * AI Memory table
 * Stores AI conversation history and context
 */
export const aiMemoriesTable = pgTable(
  'ai_memories',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Message (user or AI response)
    role: text('role').notNull(),  // 'user' | 'assistant'
    content: text('content').notNull(),

    // Metadata
    messageType: text('message_type'),  // 'scope_analysis', 'risk_detection', etc.
    tokensUsed: numeric('tokens_used'),  // For cost tracking
    modelUsed: text('model_used'),  // 'claude-3.5-sonnet', etc.

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',
    }),
    index('idx_ai_memories_project_id').on(table.projectId),
    index('idx_ai_memories_user_id').on(table.userId),
    // Index for retrieving conversation history
    index('idx_ai_memories_project_created')
      .on(table.projectId, table.createdAt),
  ]
);

export type AiMemory = typeof aiMemoriesTable.$inferSelect;
export type CreateAiMemoryInput = typeof aiMemoriesTable.$inferInsert;

export const aiMemoriesRelations = relations(aiMemoriesTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [aiMemoriesTable.projectId],
    references: [projectsTable.id],
  }),
  user: one(usersTable, {
    fields: [aiMemoriesTable.userId],
    references: [usersTable.id],
  }),
}));
```

```typescript
// packages/database/src/schema/ai-memory.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  foreignKey,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from './projects';
import { usersTable } from './users';

/**
 * AI Memory table (Long-term memory)
 * Stores aggregated learnings and insights from conversations
 * Split from conversations for long-term storage and learning
 * Used for:
 * - Pattern recognition across projects
 * - Improving future recommendations
 * - Historical analysis and reporting
 * - Compliance and audit trails
 */
export const aiMemoriesTable = pgTable(
  'ai_memories',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys (optional - can be null for system-level learnings)
    projectId: uuid('project_id'),
    userId: uuid('user_id'),

    // Memory Type/Category
    memoryType: text('memory_type').notNull(),
    // 'project_pattern',
    // 'risk_insight',
    // 'scope_lesson',
    // 'estimation_accuracy',
    // 'client_behavior',
    // 'ai_improvement',
    // etc.

    // Memory Content
    title: text('title').notNull(),
    description: text('description').notNull(),
    content: jsonb('content').notNull(),
    // Structure depends on memoryType

    // Metadata
    sourceData: jsonb('source_data'),  // Original conversation/data that led to this memory
    confidence: numeric('confidence', { precision: 3, scale: 2 }).default('0.8'),  // 0-1
    relevance: text('relevance').default('high'),  // 'low' | 'medium' | 'high'

    // Usage Tracking
    timesReferenced: numeric('times_referenced').default(0),
    lastReferencedAt: timestamp('last_referenced_at', { withTimezone: true }),

    // Validation
    validated: text('validated').default('false'),  // Has human verified this?
    validatedBy: uuid('validated_by'),
    validatedAt: timestamp('validated_at', { withTimezone: true }),

    // Relationships
    relatedMemoryIds: jsonb('related_memory_ids').default('[]'),  // Links to related memories

    // Audit Columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'set null',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'set null',
    }),
    index('idx_ai_memories_memory_type').on(table.memoryType),
    index('idx_ai_memories_project_id').on(table.projectId),
    index('idx_ai_memories_user_id').on(table.userId),
    index('idx_ai_memories_relevance').on(table.relevance),
    index('idx_ai_memories_confidence').on(table.confidence),
    index('idx_ai_memories_created').on(table.createdAt),
  ]
);

export type AiMemory = typeof aiMemoriesTable.$inferSelect;
export type CreateAiMemoryInput = typeof aiMemoriesTable.$inferInsert;

export const aiMemoriesRelations = relations(
  aiMemoriesTable,
  ({ one }) => ({
    project: one(projectsTable, {
      fields: [aiMemoriesTable.projectId],
      references: [projectsTable.id],
    }),
    user: one(usersTable, {
      fields: [aiMemoriesTable.userId],
      references: [usersTable.id],
    }),
  })
);
```

---

## 15. Events Table (Audit Trail)

```typescript
// packages/database/src/schema/events.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

/**
 * Events table
 * Immutable log of all domain events
 * Used for audit trail and event sourcing
 */
export const eventsTable = pgTable(
  'events',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Event Type
    eventType: text('event_type').notNull(),
    // Examples: 'project:created', 'invoice:paid', 'scope_drift_detected'

    // Aggregate (what entity changed)
    aggregateType: text('aggregate_type').notNull(),  // 'project', 'invoice'
    aggregateId: uuid('aggregate_id').notNull(),  // projectId, invoiceId

    // Who triggered the event
    userId: uuid('user_id'),

    // Event Data (complete event payload)
    data: jsonb('data').notNull(),

    // Event Source
    source: text('source').notNull(),  // 'user_action', 'system_auto', 'ai_system', 'webhook'

    // Version (for event sequencing)
    version: integer('version').notNull(),

    // Audit Columns
    timestamp: timestamp('timestamp', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Indexes for common queries
    index('idx_events_aggregate')
      .on(table.aggregateType, table.aggregateId),
    index('idx_events_timestamp').on(table.timestamp),
    index('idx_events_user_id').on(table.userId),
    index('idx_events_event_type').on(table.eventType),
  ]
);

export type Event = typeof eventsTable.$inferSelect;
export type CreateEventInput = typeof eventsTable.$inferInsert;
```

---

## 16. Schema Index Export

```typescript
// packages/database/src/schema/index.ts

// Export all enums
export {
  userRoleEnum,
  workspaceRoleEnum,
  projectStatusEnum,
  invoiceStatusEnum,
  paymentStatusEnum,
  paymentMethodEnum,
  milestoneStatusEnum,
  requirementStatusEnum,
  changeRequestStatusEnum,
  changeRequestImpactEnum,
} from './enums';

// Export all tables
export {
  usersTable,
  workspacesTable,
  workspaceMembersTable,
  clientsTable,
  projectsTable,
  requirementsTable,
  scopeAnalysisTable,
  changeRequestsTable,
  milestonesTable,
  invoicesTable,
  paymentsTable,
  aiConversationsTable,
  aiMemoriesTable,
  eventsTable,
} from './tables';

// Export all types
export type {
  User,
  CreateUserInput,
  Workspace,
  CreateWorkspaceInput,
  WorkspaceMember,
  CreateWorkspaceMemberInput,
  Client,
  CreateClientInput,
  UpdateClientInput,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  Requirement,
  CreateRequirementInput,
  ScopeAnalysis,
  CreateScopeAnalysisInput,
  ChangeRequest,
  CreateChangeRequestInput,
  Milestone,
  CreateMilestoneInput,
  Invoice,
  CreateInvoiceInput,
  Payment,
  CreatePaymentInput,
  AiConversation,
  CreateAiConversationInput,
  AiMemory,
  CreateAiMemoryInput,
  Event,
  CreateEventInput,
} from './tables';

// Export all relations
export {
  usersRelations,
  workspacesRelations,
  workspaceMembersRelations,
  clientsRelations,
  projectsRelations,
  requirementsRelations,
  scopeAnalysisRelations,
  changeRequestsRelations,
  milestonesRelations,
  invoicesRelations,
  paymentsRelations,
  aiConversationsRelations,
  aiMemoriesRelations,
} from './tables';
```

---

## 17. Migration Strategy

### Migration Files

```sql
-- migrations/001_init_enums.sql
-- Create all enum types

CREATE TYPE user_role AS ENUM ('admin', 'workspace_owner', 'workspace_member', 'client');
CREATE TYPE workspace_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed', 'cancelled', 'archived');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'paid', 'overdue', 'disputed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'successful', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('upi', 'bank_transfer', 'credit_card', 'debit_card', 'other');
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'cancelled');
CREATE TYPE requirement_status AS ENUM ('draft', 'proposed', 'accepted', 'in_progress', 'completed', 'rejected', 'deprecated');
CREATE TYPE change_request_status AS ENUM ('draft', 'proposed', 'accepted', 'rejected', 'in_progress', 'completed');
CREATE TYPE change_request_impact AS ENUM ('low', 'medium', 'high', 'critical');
```

```sql
-- migrations/002_init_core.sql
-- Create core tables (users, workspaces, clients)

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'workspace_member',
  avatar TEXT,
  bio TEXT,
  gst_registered TEXT NOT NULL DEFAULT 'no',
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings TEXT DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID,
  updated_by UUID
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  invited_by UUID,
  left_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE UNIQUE INDEX idx_workspace_members_unique ON workspace_members(workspace_id, user_id);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IN',
  company_name TEXT,
  gst_number TEXT,
  contact_person TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_clients_workspace_id ON clients(workspace_id);
CREATE INDEX idx_clients_email ON clients(email);

-- ... more migrations for projects, invoices, etc. ...
```

---

## 18. Query Patterns

### Create Project with Full Structure

```typescript
async function createProjectFull(
  workspaceId: string,
  clientId: string,
  userId: string,
  projectData: CreateProjectInput,
  requirements: CreateRequirementInput[]
) {
  return db.transaction(async (tx) => {
    // 1. Create project
    const [project] = await tx
      .insert(projectsTable)
      .values({
        ...projectData,
        workspaceId,
        clientId,
        userId,
      })
      .returning();

    // 2. Create requirements
    const createdRequirements = await tx
      .insert(requirementsTable)
      .values(
        requirements.map((r, idx) => ({
          ...r,
          projectId: project.id,
          createdBy: userId,
          order: idx + 1,
        }))
      )
      .returning();

    // 3. Create initial scope analysis (v1)
    const [scopeAnalysis] = await tx
      .insert(scopeAnalysisTable)
      .values({
        projectId: project.id,
        createdBy: userId,
        version: 1,
        isLatest: 'true',
        requirements: createdRequirements,
        deliverables: [],
        risks: [],
      })
      .returning();

    return { project, requirements: createdRequirements, scopeAnalysis };
  });
}
```

### Get Project with All Relationships

```typescript
async function getProjectComplete(projectId: string) {
  return db.query.projectsTable.findFirst({
    where: eq(projectsTable.id, projectId),
    with: {
      workspace: true,
      client: true,
      user: true,
      milestones: {
        orderBy: asc(milestonesTable.order),
      },
      invoices: {
        with: {
          payments: {
            orderBy: desc(paymentsTable.createdAt),
          },
        },
      },
      requirements: {
        where: isNull(requirementsTable.deletedAt),
        orderBy: asc(requirementsTable.order),
      },
      scopeAnalysisVersions: {
        orderBy: desc(scopeAnalysisTable.version),
      },
      changeRequests: {
        orderBy: desc(changeRequestsTable.createdAt),
      },
      aiConversations: {
        orderBy: desc(aiConversationsTable.createdAt),
        limit: 50,  // Last 50 messages
      },
    },
  });
}
```

### Get Latest Scope Analysis Version

```typescript
async function getLatestScopeAnalysis(projectId: string) {
  return db.query.scopeAnalysisTable.findFirst({
    where: and(
      eq(scopeAnalysisTable.projectId, projectId),
      eq(scopeAnalysisTable.isLatest, 'true')
    ),
  });
}
```

### Track Scope Analysis Versions

```typescript
async function createScopeAnalysisVersion(
  projectId: string,
  userId: string,
  analysis: Omit<CreateScopeAnalysisInput, 'projectId' | 'createdBy' | 'version'>
) {
  return db.transaction(async (tx) => {
    // Mark previous version as not latest
    await tx
      .update(scopeAnalysisTable)
      .set({ isLatest: 'false' })
      .where(
        and(
          eq(scopeAnalysisTable.projectId, projectId),
          eq(scopeAnalysisTable.isLatest, 'true')
        )
      );

    // Get next version number
    const lastVersion = await tx
      .select({ version: scopeAnalysisTable.version })
      .from(scopeAnalysisTable)
      .where(eq(scopeAnalysisTable.projectId, projectId))
      .orderBy(desc(scopeAnalysisTable.version))
      .limit(1);

    const nextVersion = (lastVersion[0]?.version || 0) + 1;

    // Create new version
    const [newAnalysis] = await tx
      .insert(scopeAnalysisTable)
      .values({
        ...analysis,
        projectId,
        createdBy: userId,
        version: nextVersion,
        isLatest: 'true',
      })
      .returning();

    return newAnalysis;
  });
}
```

### Record Payment for Invoice

```typescript
async function recordPayment(
  invoiceId: string,
  userId: string,
  payment: Omit<CreatePaymentInput, 'invoiceId' | 'userId'>
) {
  return db.transaction(async (tx) => {
    // Create payment record
    const [newPayment] = await tx
      .insert(paymentsTable)
      .values({
        ...payment,
        invoiceId,
        userId,
      })
      .returning();

    // Check if invoice is now fully paid
    const invoice = await tx.query.invoicesTable.findFirst({
      where: eq(invoicesTable.id, invoiceId),
    });

    const allPayments = await tx.query.paymentsTable.findMany({
      where: eq(paymentsTable.invoiceId, invoiceId),
    });

    const totalPaid = allPayments.reduce((sum, p) => {
      return sum + (p.amount ? parseFloat(p.amount.toString()) : 0);
    }, 0);

    const invoiceTotal = invoice?.totalAmount
      ? parseFloat(invoice.totalAmount.toString())
      : 0;

    // Update invoice status if fully paid
    if (totalPaid >= invoiceTotal) {
      await tx
        .update(invoicesTable)
        .set({
          status: 'paid',
          updatedAt: new Date(),
        })
        .where(eq(invoicesTable.id, invoiceId));
    }

    return newPayment;
  });
}
```

### List Projects by Workspace

```typescript
async function listWorkspaceProjects(
  workspaceId: string,
  filters?: {
    status?: string;
    clientId?: string;
  }
) {
  let query = db.query.projectsTable.findMany({
    where: and(
      eq(projectsTable.workspaceId, workspaceId),
      isNull(projectsTable.deletedAt)
    ),
    with: {
      client: true,
      invoices: {
        with: {
          payments: true,
        },
      },
    },
    orderBy: desc(projectsTable.createdAt),
  });

  if (filters?.status) {
    query = db.query.projectsTable.findMany({
      where: and(
        eq(projectsTable.workspaceId, workspaceId),
        eq(projectsTable.status, filters.status),
        isNull(projectsTable.deletedAt)
      ),
    });
  }

  return query;
}
```

### Get Workspace Members

```typescript
async function getWorkspaceMembers(workspaceId: string) {
  return db.query.workspaceMembersTable.findMany({
    where: eq(workspaceMembersTable.workspaceId, workspaceId),
    with: {
      user: true,
    },
    orderBy: asc(workspaceMembersTable.joinedAt),
  });
}
```

### Get AI Conversation History

```typescript
async function getConversationHistory(
  projectId: string,
  conversationId: string
) {
  return db.query.aiConversationsTable.findMany({
    where: and(
      eq(aiConversationsTable.projectId, projectId),
      eq(aiConversationsTable.conversationId, conversationId)
    ),
    orderBy: asc(aiConversationsTable.messageIndex),
  });
}
```

---

## 19. Database Schema Decision Log

### Scope Analysis: 1:N vs 1:1
**Decision:** 1:N (Versioned)
**Rationale:** 
- Allows tracking analysis history over project lifecycle
- Can compare different analyses
- Useful for learning and audit trails
- Query latest version via `isLatest` flag

### Deliverables: JSONB vs Table
**Decision:** JSONB (MVP), Table (Future)
**Rationale:**
- MVP keeps structure simpler
- JSONB is flexible for evolving deliverable format
- If detailed tracking of deliverable history needed, migrate to separate table
- Performance acceptable for typical projects (< 100 deliverables)

### Payments: Dedicated Table vs Embedded
**Decision:** Dedicated Payment table
**Rationale:**
- Supports partial payments
- Tracks payment history
- Enables payment analytics
- Cleaner separation of concerns
- Payment events (failures, refunds, retries) better modeled

### AI Memory: Separate from Conversations
**Decision:** Split into two tables
**Rationale:**
- Conversations: Short-term (chat history, debugging)
- Memory: Long-term (learnings, patterns, insights)
- Conversations archived/deleted after 90 days
- Memory retained indefinitely for AI learning
- Different access patterns and retention policies

### Status Fields: Enums vs Text
**Decision:** pgEnum for better type safety
**Rationale:**
- Prevents invalid status values
- Database enforces constraints
- Better performance than text comparison
- Clear contracts in code

---

## 20. Related Documentation

- See `database.md` for technology choices and ORM selection
- See `event-model.md` for events triggered by database changes
- See `.kiro/`, branch naming, and git workflow in development docs
- See `docs/03-ai/` for AI system architecture

---

**End of Drizzle Schema Documentation (v2.0)**

For questions or updates, contact the engineering team.

---

## Appendix: Future Enhancements

### Post-MVP Considerations

1. **Deliverables Table** - If deliverable tracking becomes complex:
   - Track deliverable status changes
   - Multiple deliverable versions
   - Audit trail per deliverable

2. **Advanced Scope Tracking** - Add:
   - Scope creep detection alerts
   - Timeline impact analysis
   - Budget vs. actual tracking
   - Variance analysis queries

3. **Payment Reconciliation** - Add:
   - Bank statement reconciliation table
   - Multi-currency support
   - Tax compliance tracking
   - Payment plan support

4. **Workspace Analytics** - Add:
   - Project profitability metrics
   - Resource utilization tracking
   - Client lifetime value
   - AI model effectiveness metrics

5. **Full Event Sourcing** - Evolve from:
   - Current: Event log (immutable audit trail)
   - To: Complete event sourcing (state derived from events)
