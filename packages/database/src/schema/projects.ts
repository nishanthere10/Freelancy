import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  index,
  foreignKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { isNull } from 'drizzle-orm';
import { workspacesTable } from './workspaces';
import { clientsTable } from './clients';
import { projectStatusEnum, pricingModelEnum } from './enums';

export const projectsTable = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    clientId: uuid('client_id'),

    // Identity
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),

    // Status & Financials
    status: projectStatusEnum('status').notNull().default('draft'),
    pricingModel: pricingModelEnum('pricing_model').notNull().default('fixed'),
    budgetCurrency: varchar('budget_currency', { length: 3 }).notNull().default('INR'),
    budgetAmount: numeric('budget_amount', { precision: 12, scale: 2 }),

    // Timeline
    startDate: date('start_date'),
    targetDate: date('target_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index('idx_projects_workspace_id').on(table.workspaceId),
    clientIdx: index('idx_projects_client_id').on(table.clientId),
    statusIdx: index('idx_projects_status').on(table.status),
    workspaceSlugUnique: uniqueIndex('idx_projects_workspace_slug')
      .on(table.workspaceId, table.slug)
      .where(isNull(table.deletedAt)),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: 'projects_workspace_id_workspaces_id_fk',
    }).onDelete('cascade'),
    fkWorkspaceClient: foreignKey({
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clientsTable.workspaceId, clientsTable.id],
      name: 'fk_projects_workspace_client',
    }).onDelete('set null'),
  })
);

export type Project = typeof projectsTable.$inferSelect;
export type CreateProjectInput = typeof projectsTable.$inferInsert;
export type ProjectStatus = typeof projectStatusEnum.enumValues[number];
export type PricingModel = typeof pricingModelEnum.enumValues[number];
