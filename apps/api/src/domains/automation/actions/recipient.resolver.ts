import {
  automationEventsTable,
  clientsTable,
  invoicesTable,
  projectsTable,
  usersTable,
  workspacesTable,
} from "@repo/database";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client";
import type { AutomationEventV1 } from "../automation.events";

export interface ResolvedRecipient {
  clientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  templateVariables: Record<string, any>;
}

export async function resolveActionContact(
  workspaceId: string,
  eventId: string,
  actionPayload: {
    recipient?: "client" | "owner";
    clientId?: string;
    templateVariables?: Record<string, any>;
  },
): Promise<ResolvedRecipient> {
  const [eventRecord] = await db
    .select()
    .from(automationEventsTable)
    .where(eq(automationEventsTable.eventId, eventId))
    .limit(1);

  const eventPayload = (eventRecord?.payload || {}) as AutomationEventV1;
  const eventContext = eventPayload.context || {};
  const eventData = eventPayload.data || {};

  const recipientType = actionPayload.recipient || "client";

  if (recipientType === "owner") {
    const [workspace] = await db
      .select({ ownerId: workspacesTable.ownerId })
      .from(workspacesTable)
      .where(eq(workspacesTable.id, workspaceId))
      .limit(1);

    if (!workspace) throw new Error("Workspace not found");

    const [owner] = await db
      .select({ email: usersTable.email, firstName: usersTable.firstName })
      .from(usersTable)
      .where(eq(usersTable.id, workspace.ownerId))
      .limit(1);

    if (!owner?.email) {
      throw new Error("Workspace owner has no email on file");
    }

    return {
      recipientEmail: owner.email,
      recipientPhone: undefined,
      templateVariables: {
        ownerName: owner.firstName || "Workspace Owner",
        invoiceNumber: eventData.invoiceNumber || "",
        amount: eventData.amount || eventData.totalAmount || "",
        projectName: eventData.projectName || eventData.name || "",
        ...(actionPayload.templateVariables || {}),
      },
    };
  }

  // Recipient is client
  let targetClientId = actionPayload.clientId || eventContext.clientId;

  if (!targetClientId && eventContext.invoiceId) {
    const [inv] = await db
      .select({ clientId: invoicesTable.clientId })
      .from(invoicesTable)
      .where(eq(invoicesTable.id, eventContext.invoiceId))
      .limit(1);
    targetClientId = inv?.clientId;
  }

  if (!targetClientId && eventContext.projectId) {
    const [proj] = await db
      .select({ clientId: projectsTable.clientId })
      .from(projectsTable)
      .where(eq(projectsTable.id, eventContext.projectId))
      .limit(1);
    targetClientId = proj?.clientId;
  }

  if (!targetClientId) {
    throw new Error("Unable to resolve client from automation event context");
  }

  const [client] = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      email: clientsTable.email,
      phone: clientsTable.phone,
    })
    .from(clientsTable)
    .where(
      and(
        eq(clientsTable.id, targetClientId),
        eq(clientsTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!client) {
    throw new Error(
      `Client '${targetClientId}' not found in workspace '${workspaceId}'`,
    );
  }

  return {
    clientId: client.id,
    recipientEmail: client.email || undefined,
    recipientPhone: client.phone || undefined,
    templateVariables: {
      clientName: client.name || "Client",
      invoiceNumber: eventData.invoiceNumber || "",
      amount: eventData.amount || eventData.totalAmount || "",
      projectName: eventData.projectName || eventData.name || "",
      ...(actionPayload.templateVariables || {}),
    },
  };
}
