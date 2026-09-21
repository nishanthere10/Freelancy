import { pgEnum } from "drizzle-orm/pg-core";

export const clientStatusEnum = pgEnum("client_status", [
  "active",
  "inactive",
  "archived",
]);
export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "active",
  "completed",
  "archived",
]);
export const pricingModelEnum = pgEnum("pricing_model", [
  "fixed",
  "hourly",
  "retainer",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);
export const projectDeliverableStatusEnum = pgEnum(
  "project_deliverable_status",
  ["pending", "in_progress", "completed"],
);

export const changeOrderStatusEnum = pgEnum("change_order_status", [
  "draft",
  "approved",
  "rejected",
  "cancelled",
]);

export const communicationChannelEnum = pgEnum("communication_channel", [
  "email",
  "whatsapp",
]);

export const communicationProviderEnum = pgEnum("communication_provider", [
  "resend",
  "wa_akg",
  "meta_whatsapp",
  "mock",
]);

export const communicationMessageStatusEnum = pgEnum(
  "communication_message_status",
  [
    "queued",
    "sending",
    "sent",
    "delivered",
    "read",
    "received",
    "failed",
    "bounced",
  ],
);

export const communicationDirectionEnum = pgEnum("communication_direction", [
  "outbound",
  "inbound",
]);

export const communicationChannelStatusEnum = pgEnum(
  "communication_channel_status",
  ["active", "inactive", "error"],
);

export const automationStatusEnum = pgEnum("automation_status", [
  "draft",
  "active",
  "paused",
  "error",
  "archived",
]);

export const automationTriggerTypeEnum = pgEnum("automation_trigger_type", [
  "event",
  "schedule",
]);

export const automationRunStatusEnum = pgEnum("automation_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped",
  "cancelled",
]);

export const automationEventStatusEnum = pgEnum("automation_event_status", [
  "pending",
  "dispatched",
  "failed",
  "dead_lettered",
]);

export const automationActionRunStatusEnum = pgEnum("automation_action_run_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);
