import {
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { changeOrdersTable } from "./change_orders";
import { projectDeliverableStatusEnum } from "./enums";
import { invoicesTable } from "./invoices";
import { projectsTable } from "./projects";
import { scopeAnalysesTable } from "./scope_analyses";
import { workspacesTable } from "./workspaces";

export const projectDeliverablesTable = pgTable(
  "project_deliverables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),

    // Content & Spec
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    // Hours & Complexity
    estimatedHours: numeric("estimated_hours", { precision: 6, scale: 2 })
      .notNull()
      .default("0.00"),
    loggedHours: numeric("logged_hours", { precision: 6, scale: 2 })
      .notNull()
      .default("0.00"),
    complexity: varchar("complexity", { length: 20 })
      .notNull()
      .default("medium"),

    // Execution Lifecycle
    status: projectDeliverableStatusEnum("status").notNull().default("pending"),
    position: integer("position").notNull().default(0),

    // Provenance & Billing
    sourceScopeId: uuid("source_scope_id"),
    changeOrderId: uuid("change_order_id"),
    invoiceId: uuid("invoice_id"),
    billedAt: timestamp("billed_at", { withTimezone: true }),

    // Timestamps
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("idx_project_deliverables_workspace_id").on(
      table.workspaceId,
    ),
    projectIdx: index("idx_project_deliverables_project_id").on(
      table.projectId,
    ),
    statusIdx: index("idx_project_deliverables_status").on(table.status),
    invoiceIdx: index("idx_project_deliverables_invoice_id").on(
      table.invoiceId,
    ),
    changeOrderIdx: index("idx_project_deliverables_change_order_id").on(
      table.changeOrderId,
    ),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "fk_project_deliverables_workspace",
    }).onDelete("cascade"),
    fkWorkspaceProject: foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projectsTable.workspaceId, projectsTable.id],
      name: "fk_project_deliverables_workspace_project",
    }).onDelete("cascade"),
    fkSourceScope: foreignKey({
      columns: [table.sourceScopeId],
      foreignColumns: [scopeAnalysesTable.id],
      name: "fk_project_deliverables_source_scope",
    }).onDelete("set null"),
    fkChangeOrder: foreignKey({
      columns: [table.changeOrderId],
      foreignColumns: [changeOrdersTable.id],
      name: "fk_project_deliverables_change_order",
    }).onDelete("set null"),
    fkInvoice: foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoicesTable.id],
      name: "fk_project_deliverables_invoice",
    }).onDelete("set null"),
  }),
);

export type ProjectDeliverable = typeof projectDeliverablesTable.$inferSelect;
export type CreateProjectDeliverableInput =
  typeof projectDeliverablesTable.$inferInsert;
export type ProjectDeliverableStatus =
  (typeof projectDeliverableStatusEnum.enumValues)[number];
