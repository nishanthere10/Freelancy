export interface AutomationEventContext {
  clientId?: string;
  projectId?: string;
  invoiceId?: string;
  deliverableId?: string;
  changeOrderId?: string;
}

export interface AutomationEventV1 {
  version: 1;
  eventId: string;
  eventType: string; // e.g. "invoice.overdue"
  occurredAt: string; // ISO 8601
  workspaceId: string;
  actorId: string | null;
  entity: {
    type: "invoice" | "project" | "client" | "deliverable" | "change_order" | "communication";
    id: string;
  };
  context?: AutomationEventContext;
  data?: Record<string, any>;
}

export type SupportedAutomationEvents =
  | "client.created"
  | "client.updated"
  | "project.created"
  | "project.updated"
  | "project.completed"
  | "project.deliverable.created"
  | "project.deliverable.started"
  | "project.deliverable.completed"
  | "invoice.created"
  | "invoice.sent"
  | "invoice.due"
  | "invoice.overdue"
  | "payment.recorded"
  | "change_order.proposed"
  | "change_order.approved"
  | "change_order.rejected"
  | "change_order.cancelled"
  | "communication.email.sent"
  | "communication.email.delivered"
  | "communication.email.received"
  | "communication.whatsapp.sent"
  | "communication.whatsapp.delivered"
  | "communication.whatsapp.received";
