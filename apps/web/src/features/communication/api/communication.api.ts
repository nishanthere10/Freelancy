import { apiGet, apiPost } from "@api/client";
import type {
  ListMessagesQueryParams,
  SendEmailPayload,
  SendWhatsAppPayload,
} from "../schemas/communication.schemas";
import type { MessageWithRelations } from "../types/communication.types";

export async function sendEmail(
  workspaceId: string,
  data: SendEmailPayload,
): Promise<MessageWithRelations> {
  return apiPost<MessageWithRelations>(
    `workspaces/${workspaceId}/communications/email`,
    data,
  );
}

export async function sendWhatsApp(
  workspaceId: string,
  data: SendWhatsAppPayload,
): Promise<MessageWithRelations> {
  return apiPost<MessageWithRelations>(
    `workspaces/${workspaceId}/communications/whatsapp`,
    data,
  );
}

export async function listMessages(
  workspaceId: string,
  filters?: ListMessagesQueryParams,
): Promise<MessageWithRelations[]> {
  const params = new URLSearchParams();
  if (filters?.clientId) params.append("clientId", filters.clientId);
  if (filters?.projectId) params.append("projectId", filters.projectId);
  if (filters?.invoiceId) params.append("invoiceId", filters.invoiceId);
  if (filters?.changeOrderId) params.append("changeOrderId", filters.changeOrderId);
  if (filters?.channel) params.append("channel", filters.channel);
  if (filters?.direction) params.append("direction", filters.direction);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.limit) params.append("limit", String(filters.limit));
  if (filters?.offset) params.append("offset", String(filters.offset));

  const queryString = params.toString();
  const url = `workspaces/${workspaceId}/communications/messages${
    queryString ? `?${queryString}` : ""
  }`;
  return apiGet<MessageWithRelations[]>(url);
}
