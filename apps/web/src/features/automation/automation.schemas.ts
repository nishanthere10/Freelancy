import { z } from "zod";

export const ConditionOperatorSchema = z.enum([
  "eq",
  "neq",
  "contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "exists",
]);

export const ConditionSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: ConditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export const ConditionGroupSchema = z.object({
  operator: z.enum(["AND", "OR"]),
  conditions: z.array(ConditionSchema).max(20),
});

export const ActionTypeSchema = z.enum([
  "send_email",
  "send_whatsapp",
  "notify_owner",
  "create_follow_up",
]);

export const AutomationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("send_email"),
    templateKey: z.string().min(1, "Template is required"),
    recipient: z.enum(["client", "owner"]),
  }),
  z.object({
    type: z.literal("send_whatsapp"),
    templateKey: z.string().min(1, "Template is required"),
    recipient: z.enum(["client", "owner"]),
  }),
  z.object({
    type: z.literal("notify_owner"),
    messageTemplate: z.string().min(1, "Message is required").max(1000),
  }),
  z.object({
    type: z.literal("create_follow_up"),
    title: z.string().min(1, "Title is required").max(255),
  }),
]);

export const TriggerConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("event"),
    eventType: z.string().min(1, "Event type is required"),
  }),
  z.object({
    type: z.literal("schedule"),
    frequency: z.enum(["daily", "weekly"]),
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59),
    dayOfWeek: z.number().min(0).max(6).optional(),
    timezone: z.string().min(1),
  }),
]);

export const CreateAutomationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  triggerType: z.enum(["event", "schedule"]),
  triggerConfig: TriggerConfigSchema,
  conditionConfig: ConditionGroupSchema,
  actionConfig: z.array(AutomationActionSchema).min(1, "At least one action is required").max(10),
  timezone: z.string().min(1),
});

export type CreateAutomationFormValues = z.infer<typeof CreateAutomationSchema>;
