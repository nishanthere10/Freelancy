import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { usersTable } from "./users";
import { workspacesTable } from "./workspaces";

export const scopeAnalysesTable = pgTable(
  "scope_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projectsTable.id, {
      onDelete: "set null",
    }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => usersTable.id),
    inputText: text("input_text").notNull(),
    result: jsonb("result").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("idx_scope_analyses_workspace_id").on(table.workspaceId),
    projectIdx: index("idx_scope_analyses_project_id").on(table.projectId),
    actorUserIdx: index("idx_scope_analyses_actor_user_id").on(table.actorUserId),
    createdAtIdx: index("idx_scope_analyses_created_at").on(table.createdAt),
  }),
);

export type ScopeAnalysis = typeof scopeAnalysesTable.$inferSelect;
export type CreateScopeAnalysisInput = typeof scopeAnalysesTable.$inferInsert;
