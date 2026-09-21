import {
  boolean,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { changeOrdersTable } from "./change_orders";
import { clientsTable } from "./clients";
import {
  communicationChannelEnum,
  communicationChannelStatusEnum,
  communicationDirectionEnum,
  communicationMessageStatusEnum,
  communicationProviderEnum,
} from "./enums";
import { invoicesTable } from "./invoices";
import { projectsTable } from "./projects";
import { usersTable } from "./users";
import { workspacesTable } from "./workspaces";

/**
 * communication_channels
 * Represents workspace-level delivery channels (Email, WhatsApp)
 */
export const communicationChannelsTable = pgTable(
  "communication_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    channel: communicationChannelEnum("channel").notNull(),
    provider: communicationProviderEnum("provider").notNull(),
    status: communicationChannelStatusEnum("status")
      .notNull()
      .default("active"),
    senderIdentity: varchar("sender_identity", { length: 255 }),
    displayName: varchar("display_name", { length: 255 }),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    createdByUserId: uuid("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("idx_comm_channels_workspace_id").on(
      table.workspaceId,
    ),
    workspaceChannelUnique: uniqueIndex(
      "idx_comm_channels_workspace_channel",
    ).on(table.workspaceId, table.channel),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "fk_comm_channels_workspace",
    }).onDelete("cascade"),
    fkCreatedByUser: foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [usersTable.id],
      name: "fk_comm_channels_created_by_user",
    }).onDelete("set null"),
  }),
);

/**
 * communication_messages
 * Central transactional record for all outbound and inbound messages
 */
export const communicationMessagesTable = pgTable(
  "communication_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),

    // Related domain entities
    clientId: uuid("client_id"),
    projectId: uuid("project_id"),
    invoiceId: uuid("invoice_id"),
    changeOrderId: uuid("change_order_id"),

    // Channel & Direction
    channel: communicationChannelEnum("channel").notNull(),
    direction: communicationDirectionEnum("direction")
      .notNull()
      .default("outbound"),
    provider: communicationProviderEnum("provider").notNull(),

    // Provider correlation
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    providerThreadId: varchar("provider_thread_id", { length: 255 }),

    // Addresses
    recipientAddress: varchar("recipient_address", { length: 255 }).notNull(),
    senderAddress: varchar("sender_address", { length: 255 }),

    // Content
    subject: varchar("subject", { length: 500 }),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html"),

    // Template metadata
    templateKey: varchar("template_key", { length: 100 }),
    templateVariables: jsonb("template_variables")
      .$type<Record<string, unknown>>()
      .default({}),

    // Delivery state
    status: communicationMessageStatusEnum("status")
      .notNull()
      .default("queued"),
    errorMessage: text("error_message"),

    // Idempotency
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),

    // Timestamps
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceCreatedIdx: index("idx_comm_messages_workspace_created").on(
      table.workspaceId,
      table.createdAt,
    ),
    clientCreatedIdx: index("idx_comm_messages_client_created").on(
      table.workspaceId,
      table.clientId,
      table.createdAt,
    ),
    projectCreatedIdx: index("idx_comm_messages_project_created").on(
      table.workspaceId,
      table.projectId,
      table.createdAt,
    ),
    invoiceIdx: index("idx_comm_messages_invoice").on(
      table.workspaceId,
      table.invoiceId,
    ),
    changeOrderIdx: index("idx_comm_messages_change_order").on(
      table.workspaceId,
      table.changeOrderId,
    ),
    providerMsgIdIdx: index("idx_comm_messages_provider_msg_id").on(
      table.workspaceId,
      table.providerMessageId,
    ),
    idempotencyUnique: uniqueIndex("idx_comm_messages_idempotency").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "fk_comm_messages_workspace",
    }).onDelete("cascade"),
    fkClient: foreignKey({
      columns: [table.clientId],
      foreignColumns: [clientsTable.id],
      name: "fk_comm_messages_client",
    }).onDelete("set null"),
    fkProject: foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      name: "fk_comm_messages_project",
    }).onDelete("set null"),
    fkInvoice: foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoicesTable.id],
      name: "fk_comm_messages_invoice",
    }).onDelete("set null"),
    fkChangeOrder: foreignKey({
      columns: [table.changeOrderId],
      foreignColumns: [changeOrdersTable.id],
      name: "fk_comm_messages_change_order",
    }).onDelete("set null"),
  }),
);

/**
 * communication_events
 * Raw immutable event log from provider webhooks for audit and deduplication
 */
export const communicationEventsTable = pgTable(
  "communication_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    messageId: uuid("message_id"),
    provider: communicationProviderEnum("provider").notNull(),
    providerEventId: varchar("provider_event_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("idx_comm_events_workspace_id").on(table.workspaceId),
    messageIdx: index("idx_comm_events_message_id").on(table.messageId),
    providerEventUnique: uniqueIndex("idx_comm_events_provider_event").on(
      table.provider,
      table.providerEventId,
    ),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "fk_comm_events_workspace",
    }).onDelete("cascade"),
    fkMessage: foreignKey({
      columns: [table.messageId],
      foreignColumns: [communicationMessagesTable.id],
      name: "fk_comm_events_message",
    }).onDelete("set null"),
  }),
);

/**
 * communication_preferences
 * Per-client notification opt-ins and channel preferences
 */
export const communicationPreferencesTable = pgTable(
  "communication_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    clientId: uuid("client_id").notNull(),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    whatsappEnabled: boolean("whatsapp_enabled").notNull().default(true),
    projectUpdates: boolean("project_updates").notNull().default(true),
    invoiceNotifications: boolean("invoice_notifications")
      .notNull()
      .default(true),
    changeOrderNotifications: boolean("change_order_notifications")
      .notNull()
      .default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("idx_comm_preferences_workspace_id").on(
      table.workspaceId,
    ),
    clientIdx: index("idx_comm_preferences_client_id").on(table.clientId),
    workspaceClientUnique: uniqueIndex(
      "idx_comm_preferences_workspace_client",
    ).on(table.workspaceId, table.clientId),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: "fk_comm_preferences_workspace",
    }).onDelete("cascade"),
    fkClient: foreignKey({
      columns: [table.clientId],
      foreignColumns: [clientsTable.id],
      name: "fk_comm_preferences_client",
    }).onDelete("cascade"),
  }),
);

// Type definitions
export type CommunicationChannel =
  typeof communicationChannelsTable.$inferSelect;
export type CreateCommunicationChannelInput =
  typeof communicationChannelsTable.$inferInsert;

export type CommunicationMessage =
  typeof communicationMessagesTable.$inferSelect;
export type CreateCommunicationMessageInput =
  typeof communicationMessagesTable.$inferInsert;

export type CommunicationEvent = typeof communicationEventsTable.$inferSelect;
export type CreateCommunicationEventInput =
  typeof communicationEventsTable.$inferInsert;

export type CommunicationPreference =
  typeof communicationPreferencesTable.$inferSelect;
export type CreateCommunicationPreferenceInput =
  typeof communicationPreferencesTable.$inferInsert;
