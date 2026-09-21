import {
  Automation,
  AutomationActionRun,
  AutomationEvent,
  AutomationRun,
} from "@repo/database";

export type TriggerType = "event" | "schedule";
export type AutomationStatus = "draft" | "active" | "paused" | "error" | "archived";

export interface EventTriggerConfig {
  type: "event";
  eventType: string; // e.g. "invoice.overdue"
}

export interface ScheduleTriggerConfig {
  type: "schedule";
  frequency: "daily" | "weekly";
  hour: number;
  minute: number;
  dayOfWeek?: number;
  timezone: string;
}

export type ConditionOperator =
  | "eq"
  | "neq"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "exists";

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean | null;
}

export interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: Condition[];
}

export type AutomationActionConfig =
  | {
      type: "send_email";
      templateKey: string;
      recipient: "client" | "owner";
    }
  | {
      type: "send_whatsapp";
      templateKey: string;
      recipient: "client" | "owner";
    }
  | {
      type: "notify_owner";
      messageTemplate: string;
    }
  | {
      type: "create_follow_up";
      title: string;
    };

export interface CreateAutomationInput {
  workspaceId: string;
  createdByUserId: string;
  name: string;
  description?: string;
  triggerType: TriggerType;
  triggerConfig: EventTriggerConfig | ScheduleTriggerConfig;
  conditionConfig: ConditionGroup;
  actionConfig: AutomationActionConfig[];
  timezone: string;
}

export interface UpdateAutomationInput {
  name?: string;
  description?: string;
  triggerConfig?: EventTriggerConfig | ScheduleTriggerConfig;
  conditionConfig?: ConditionGroup;
  actionConfig?: AutomationActionConfig[];
  timezone?: string;
}

export interface AutomationRunDTO {
  id: string;
  workspaceId: string;
  automationId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
