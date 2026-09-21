import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { workspacesTable } from "./workspaces";
import {
  automationActionRunStatusEnum,
  automationEventStatusEnum,
  automationRunStatusEnum,
  automationStatusEnum,
  automationTriggerTypeEnum,
} from "./enums";

export const automationEventsTable = pgTable(
  "automation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    eventId: uuid("event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    version: integer("version").notNull(),
    payload: jsonb("payload").notNull(),
    status: automationEventStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("idx_automation_events_workspace").on(
      table.workspaceId,
      table.createdAt
    ),
    statusNextAttemptIdx: index("idx_automation_events_status_next").on(
      table.status,
      table.nextAttemptAt
    ),
    eventTypeOccurredIdx: index("idx_automation_events_type_occurred").on(
      table.eventType,
      table.occurredAt
    ),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "automation_events_workspace_id_fk",
    }).onDelete("cascade"),
  })
);

export const automationsTable = pgTable(
  "automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: automationStatusEnum("status").default("draft").notNull(),
    triggerType: automationTriggerTypeEnum("trigger_type").notNull(),
    triggerConfig: jsonb("trigger_config").notNull(),
    conditionConfig: jsonb("condition_config").notNull(),
    actionConfig: jsonb("action_config").notNull(),
    timezone: text("timezone").notNull(),
    definitionVersion: integer("definition_version").default(1).notNull(),
    definitionHash: text("definition_hash").notNull(),
    n8nWorkflowId: text("n8n_workflow_id"),
    n8nWorkflowVersion: text("n8n_workflow_version"),
    lastCompiledAt: timestamp("last_compiled_at", { withTimezone: true }),
    lastActivatedAt: timestamp("last_activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceStatusIdx: index("idx_automations_workspace_status").on(
      table.workspaceId,
      table.status
    ),
    workspaceCreatedIdx: index("idx_automations_workspace_created").on(
      table.workspaceId,
      table.createdAt
    ),
    workspaceTriggerIdx: index("idx_automations_workspace_trigger").on(
      table.workspaceId,
      table.triggerType
    ),
    workspaceN8nIdx: index("idx_automations_workspace_n8n").on(
      table.workspaceId,
      table.n8nWorkflowId
    ),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "automations_workspace_id_fk",
    }).onDelete("cascade"),
    fkCreatedBy: foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [usersTable.id],
      name: "automations_created_by_user_id_fk",
    }).onDelete("cascade"),
  })
);

export const automationRunsTable = pgTable(
  "automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    automationId: uuid("automation_id").notNull(),
    automationEventId: uuid("automation_event_id"),
    n8nExecutionId: text("n8n_execution_id"),
    status: automationRunStatusEnum("status").default("queued").notNull(),
    triggerSource: text("trigger_source").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceAutomationIdx: index("idx_automation_runs_workspace_automation").on(
      table.workspaceId,
      table.automationId,
      table.createdAt
    ),
    workspaceStatusIdx: index("idx_automation_runs_workspace_status").on(
      table.workspaceId,
      table.status,
      table.createdAt
    ),
    automationIdx: index("idx_automation_runs_automation").on(
      table.automationId,
      table.createdAt
    ),
    n8nExecutionIdx: index("idx_automation_runs_n8n_execution").on(
      table.n8nExecutionId
    ),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "automation_runs_workspace_id_fk",
    }).onDelete("cascade"),
    fkAutomation: foreignKey({
      columns: [table.automationId],
      foreignColumns: [automationsTable.id],
      name: "automation_runs_automation_id_fk",
    }).onDelete("cascade"),
    fkAutomationEvent: foreignKey({
      columns: [table.automationEventId],
      foreignColumns: [automationEventsTable.id],
      name: "automation_runs_automation_event_id_fk",
    }).onDelete("set null"),
  })
);

export const automationActionRunsTable = pgTable(
  "automation_action_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    automationRunId: uuid("automation_run_id").notNull(),
    actionIndex: integer("action_index").notNull(),
    actionType: text("action_type").notNull(),
    status: automationActionRunStatusEnum("status")
      .default("pending")
      .notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    runActionUnique: uniqueIndex("idx_automation_action_runs_run_action_uq").on(
      table.automationRunId,
      table.actionIndex
    ),
    workspaceIdempotencyUnique: uniqueIndex(
      "idx_automation_action_runs_workspace_idempotency_uq"
    ).on(table.workspaceId, table.idempotencyKey),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "automation_action_runs_workspace_id_fk",
    }).onDelete("cascade"),
    fkAutomationRun: foreignKey({
      columns: [table.automationRunId],
      foreignColumns: [automationRunsTable.id],
      name: "automation_action_runs_automation_run_id_fk",
    }).onDelete("cascade"),
  })
);

export type AutomationEvent = typeof automationEventsTable.$inferSelect;
export type NewAutomationEvent = typeof automationEventsTable.$inferInsert;

export type Automation = typeof automationsTable.$inferSelect;
export type NewAutomation = typeof automationsTable.$inferInsert;

export type AutomationRun = typeof automationRunsTable.$inferSelect;
export type NewAutomationRun = typeof automationRunsTable.$inferInsert;

export type AutomationActionRun = typeof automationActionRunsTable.$inferSelect;
export type NewAutomationActionRun = typeof automationActionRunsTable.$inferInsert;
