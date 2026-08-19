import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { workspacesTable } from "./workspaces";

/**
 * Activity Events Table
 * Workspace-scoped, append-only business activity history.
 */
export const activityEventsTable = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    actorUserId: uuid("actor_user_id"),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceCreatedAtIdx: index("idx_activity_events_workspace_created_at").on(
      table.workspaceId,
      table.createdAt,
    ),
    workspaceEntityIdx: index("idx_activity_events_workspace_entity").on(
      table.workspaceId,
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    workspaceActorIdx: index("idx_activity_events_workspace_actor").on(
      table.workspaceId,
      table.actorUserId,
      table.createdAt,
    ),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "activity_events_workspace_id_workspaces_id_fk",
    }).onDelete("cascade"),
    fkActorUser: foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [usersTable.id],
      name: "activity_events_actor_user_id_users_id_fk",
    }).onDelete("set null"),
  }),
);

export type ActivityEvent = typeof activityEventsTable.$inferSelect;
export type NewActivityEvent = typeof activityEventsTable.$inferInsert;
