import {
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { driftAnalysesTable } from "./drift_analyses";
import { changeOrderStatusEnum } from "./enums";
import { invoicesTable } from "./invoices";
import { projectsTable } from "./projects";
import { scopeAnalysesTable } from "./scope_analyses";
import { usersTable } from "./users";
import { workspacesTable } from "./workspaces";

export interface ProposedDeliverableItem {
  title: string;
  description?: string | null;
  estimatedHours: number;
  complexity?: "low" | "medium" | "high";
}

export const changeOrdersTable = pgTable(
  "change_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    scopeAnalysisId: uuid("scope_analysis_id").notNull(),
    driftAnalysisId: uuid("drift_analysis_id"),
    invoiceId: uuid("invoice_id"),

    changeOrderNumber: varchar("change_order_number", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: changeOrderStatusEnum("status").notNull().default("draft"),

    additionalBudget: numeric("additional_budget", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    additionalHours: numeric("additional_hours", { precision: 6, scale: 2 })
      .notNull()
      .default("0.00"),
    timelineDeltaDays: integer("timeline_delta_days").notNull().default(0),
    proposedDeliverables: jsonb("proposed_deliverables")
      .$type<ProposedDeliverableItem[]>()
      .notNull()
      .default([]),

    approvedByUserId: uuid("approved_by_user_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("idx_change_orders_workspace_id").on(table.workspaceId),
    projectIdx: index("idx_change_orders_project_id").on(table.projectId),
    statusIdx: index("idx_change_orders_status").on(table.status),
    invoiceIdx: index("idx_change_orders_invoice_id").on(table.invoiceId),
    scopeIdx: index("idx_change_orders_scope_analysis_id").on(
      table.scopeAnalysisId,
    ),
    driftIdx: index("idx_change_orders_drift_analysis_id").on(
      table.driftAnalysisId,
    ),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "fk_change_orders_workspace",
    }).onDelete("cascade"),
    fkWorkspaceProject: foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projectsTable.workspaceId, projectsTable.id],
      name: "fk_change_orders_workspace_project",
    }).onDelete("cascade"),
    fkScopeAnalysis: foreignKey({
      columns: [table.scopeAnalysisId],
      foreignColumns: [scopeAnalysesTable.id],
      name: "fk_change_orders_scope_analysis",
    }).onDelete("cascade"),
    fkDriftAnalysis: foreignKey({
      columns: [table.driftAnalysisId],
      foreignColumns: [driftAnalysesTable.id],
      name: "fk_change_orders_drift_analysis",
    }).onDelete("set null"),
    fkInvoice: foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoicesTable.id],
      name: "fk_change_orders_invoice",
    }).onDelete("set null"),
    fkApprovedByUser: foreignKey({
      columns: [table.approvedByUserId],
      foreignColumns: [usersTable.id],
      name: "fk_change_orders_approved_by_user",
    }).onDelete("set null"),
  }),
);

export type ChangeOrder = typeof changeOrdersTable.$inferSelect;
export type CreateChangeOrderInput = typeof changeOrdersTable.$inferInsert;
export type ChangeOrderStatus =
  (typeof changeOrderStatusEnum.enumValues)[number];
