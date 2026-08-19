import type {
  ActivityEntityType,
  ActivityEventType,
  ActivityMetadata,
} from "./activity.types";

/**
 * Generates clear, human-readable activity text for any domain event.
 */
export function formatActivityMessage(
  eventType: ActivityEventType,
  _entityType: ActivityEntityType,
  metadata: ActivityMetadata = {},
): string {
  const name = metadata.entityName || metadata.name;
  const clientName = metadata.clientName;
  const projectName = metadata.projectName;
  const invoiceNumber = metadata.invoiceNumber;
  const amount = metadata.amount;
  const currency = metadata.currency || "INR";

  switch (eventType) {
    // Workspace events
    case "workspace.created":
      return `Created workspace "${name || "New Workspace"}"`;
    case "workspace.updated": {
      const changed = metadata.changedFields as string[] | undefined;
      if (changed && changed.length > 0) {
        return `Updated workspace ${changed.join(", ")}`;
      }
      return "Updated workspace settings";
    }
    case "workspace.deleted":
      return `Deleted workspace "${name || ""}"`;
    case "workspace.restored":
      return `Restored workspace "${name || ""}"`;
    case "workspace.ownership_transferred":
      return "Transferred workspace ownership";
    case "workspace.member_added":
      return `Added a new workspace member (${metadata.role || "member"})`;
    case "workspace.member_removed":
      return "Removed a workspace member";
    case "workspace.member_role_changed":
      return `Changed member role from ${metadata.previousRole || "previous"} to ${metadata.newRole || "new"}`;

    // Client events
    case "client.created":
      return `Created client "${name || clientName || "New Client"}"`;
    case "client.updated":
      return `Updated client "${name || clientName || ""}"`;
    case "client.deleted":
      return `Deleted client "${name || clientName || ""}"`;
    case "client.restored":
      return `Restored client "${name || clientName || ""}"`;

    // Project events
    case "project.created":
      return `Created project "${name || projectName || "New Project"}"`;
    case "project.updated":
      return `Updated project "${name || projectName || ""}"`;
    case "project.status_changed": {
      const to = metadata.toStatus || metadata.status;
      return `Changed status of project "${name || projectName || ""}" to ${to || "new status"}`;
    }
    case "project.deleted":
      return `Deleted project "${name || projectName || ""}"`;
    case "project.restored":
      return `Restored project "${name || projectName || ""}"`;

    // Invoice events
    case "invoice.created":
      return `Created invoice ${invoiceNumber ? `#${invoiceNumber}` : ""}`;
    case "invoice.updated":
      return `Updated invoice ${invoiceNumber ? `#${invoiceNumber}` : ""}`;
    case "invoice.sent":
      return `Sent invoice ${invoiceNumber ? `#${invoiceNumber}` : ""}`;
    case "invoice.paid": {
      const amtStr = amount
        ? ` of ${currency} ${Number(amount).toLocaleString("en-IN")}`
        : "";
      return `Recorded payment${amtStr} for invoice ${invoiceNumber ? `#${invoiceNumber}` : ""}`;
    }
    case "invoice.cancelled":
      return `Cancelled invoice ${invoiceNumber ? `#${invoiceNumber}` : ""}`;
    case "invoice.deleted":
      return `Deleted invoice ${invoiceNumber ? `#${invoiceNumber}` : ""}`;

    default:
      return `Performed action ${eventType}`;
  }
}
