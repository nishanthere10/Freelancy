import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { scopeAnalysesTable } from "./scope_analyses";
import { usersTable } from "./users";
import { workspacesTable } from "./workspaces";

export const driftAnalysesTable = pgTable(
  "drift_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    scopeAnalysisId: uuid("scope_analysis_id")
      .notNull()
      .references(() => scopeAnalysesTable.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => usersTable.id),
    changeRequestText: text("change_request_text").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("idx_drift_analyses_workspace_id").on(table.workspaceId),
    scopeIdx: index("idx_drift_analyses_scope_analysis_id").on(
      table.scopeAnalysisId,
    ),
    createdAtIdx: index("idx_drift_analyses_created_at").on(table.createdAt),
  }),
);

export type DriftAnalysis = typeof driftAnalysesTable.$inferSelect;
export type CreateDriftAnalysisInput = typeof driftAnalysesTable.$inferInsert;
