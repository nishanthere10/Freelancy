export interface RenderedTemplate {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

export class TemplateService {
  /**
   * Render a communication template with variables
   */
  public render(
    templateKey: string,
    channel: "email" | "whatsapp",
    variables: Record<string, unknown> = {},
  ): RenderedTemplate {
    switch (templateKey) {
      case "invoice.created":
        return this.renderInvoiceCreated(channel, variables);
      case "invoice.due":
        return this.renderInvoiceDue(channel, variables);
      case "invoice.overdue":
        return this.renderInvoiceOverdue(channel, variables);
      case "payment.received":
        return this.renderPaymentReceived(channel, variables);
      case "project.started":
        return this.renderProjectStarted(channel, variables);
      case "project.progress":
        return this.renderProjectProgress(channel, variables);
      case "change_order.proposed":
        return this.renderChangeOrderProposed(channel, variables);
      case "change_order.approved":
        return this.renderChangeOrderApproved(channel, variables);
      default:
        return {
          subject: (variables.subject as string) || "Update from Freelancer",
          bodyText:
            (variables.message as string) || "You have a new notification.",
        };
    }
  }

  private renderInvoiceCreated(
    channel: "email" | "whatsapp",
    vars: Record<string, unknown>,
  ): RenderedTemplate {
    const clientName = (vars.clientName as string) || "Client";
    const invoiceNumber = (vars.invoiceNumber as string) || "INV-0000";
    const amount = (vars.amount as string) || "0.00";
    const dueDate = (vars.dueDate as string) || "Due on receipt";
    const invoiceUrl = (vars.invoiceUrl as string) || "";

    if (channel === "whatsapp") {
      return {
        subject: `Invoice ${invoiceNumber}`,
        bodyText: `Hello ${clientName}, your invoice *#${invoiceNumber}* for *${amount}* is ready. Due date: ${dueDate}.${
          invoiceUrl ? `\n\nView invoice: ${invoiceUrl}` : ""
        }\n\nThank you for your business!`,
      };
    }

    return {
      subject: `Invoice #${invoiceNumber} from your project`,
      bodyText: `Hi ${clientName},\n\nYour new invoice #${invoiceNumber} for ${amount} has been generated and is due by ${dueDate}.\n\n${
        invoiceUrl ? `You can view the invoice online here: ${invoiceUrl}\n\n` : ""
      }Thank you for your business!`,
      bodyHtml: `<p>Hi ${clientName},</p><p>Your invoice <strong>#${invoiceNumber}</strong> for <strong>${amount}</strong> has been generated and is due on <strong>${dueDate}</strong>.</p>${
        invoiceUrl
          ? `<p><a href="${invoiceUrl}" style="background:#4F46E5;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;">View Invoice</a></p>`
          : ""
      }<p>Thank you for your business!</p>`,
    };
  }

  private renderInvoiceDue(
    channel: "email" | "whatsapp",
    vars: Record<string, unknown>,
  ): RenderedTemplate {
    const clientName = (vars.clientName as string) || "Client";
    const invoiceNumber = (vars.invoiceNumber as string) || "INV-0000";
    const amount = (vars.amount as string) || "0.00";
    const dueDate = (vars.dueDate as string) || "today";

    if (channel === "whatsapp") {
      return {
        subject: `Payment Reminder: ${invoiceNumber}`,
        bodyText: `Hi ${clientName}, friendly reminder that invoice *#${invoiceNumber}* for *${amount}* is due on *${dueDate}*. Please let us know if you need any assistance!`,
      };
    }

    return {
      subject: `Payment Reminder: Invoice #${invoiceNumber}`,
      bodyText: `Hi ${clientName},\n\nThis is a friendly reminder that invoice #${invoiceNumber} for ${amount} is due on ${dueDate}.\n\nPlease let us know if you have any questions.`,
    };
  }

  private renderInvoiceOverdue(
    channel: "email" | "whatsapp",
    vars: Record<string, unknown>,
  ): RenderedTemplate {
    const clientName = (vars.clientName as string) || "Client";
    const invoiceNumber = (vars.invoiceNumber as string) || "INV-0000";
    const amount = (vars.amount as string) || "0.00";

    return {
      subject: `URGENT: Invoice #${invoiceNumber} is Overdue`,
      bodyText:
        channel === "whatsapp"
          ? `Hello ${clientName}, invoice *#${invoiceNumber}* (${amount}) is currently overdue. Please process payment as soon as possible or contact us if already sent.`
          : `Hello ${clientName},\n\nOur records show that invoice #${invoiceNumber} for ${amount} is overdue. Please arrange payment as soon as possible, or let us know if this has already been settled.\n\nThank you.`,
    };
  }

  private renderPaymentReceived(
    channel: "email" | "whatsapp",
    vars: Record<string, unknown>,
  ): RenderedTemplate {
    const clientName = (vars.clientName as string) || "Client";
    const invoiceNumber = (vars.invoiceNumber as string) || "INV-0000";
    const amount = (vars.amount as string) || "0.00";

    return {
      subject: `Payment Received: Invoice #${invoiceNumber}`,
      bodyText:
        channel === "whatsapp"
          ? `Thank you ${clientName}! We have received payment of *${amount}* for invoice *#${invoiceNumber}*. Payment receipt has been recorded.`
          : `Hi ${clientName},\n\nWe have successfully received your payment of ${amount} for invoice #${invoiceNumber}.\n\nThank you for your prompt payment!`,
    };
  }

  private renderProjectStarted(
    channel: "email" | "whatsapp",
    vars: Record<string, unknown>,
  ): RenderedTemplate {
    const clientName = (vars.clientName as string) || "Client";
    const projectName = (vars.projectName as string) || "your project";

    return {
      subject: `Project Kickoff: ${projectName}`,
      bodyText: `Hi ${clientName},\n\nWork on "${projectName}" has officially begun! We will keep you updated as key milestones are completed.`,
    };
  }

  private renderProjectProgress(
    channel: "email" | "whatsapp",
    vars: Record<string, unknown>,
  ): RenderedTemplate {
    const clientName = (vars.clientName as string) || "Client";
    const projectName = (vars.projectName as string) || "Project";
    const milestone = (vars.milestone as string) || "Milestone completed";

    return {
      subject: `Progress Update: ${projectName}`,
      bodyText: `Hi ${clientName},\n\nHere is a quick update on "${projectName}":\n\n✓ ${milestone}\n\nWe are on schedule. Reach out if you have any questions!`,
    };
  }

  private renderChangeOrderProposed(
    channel: "email" | "whatsapp",
    vars: Record<string, unknown>,
  ): RenderedTemplate {
    const clientName = (vars.clientName as string) || "Client";
    const title = (vars.title as string) || "New Scope Proposal";
    const additionalBudget = (vars.additionalBudget as string) || "0.00";
    const timelineDeltaDays = vars.timelineDeltaDays || 0;

    return {
      subject: `Change Order Proposal: ${title}`,
      bodyText:
        channel === "whatsapp"
          ? `Hi ${clientName}, we have prepared a Change Order proposal for *${title}*.\n\n• Budget Impact: *+${additionalBudget}*\n• Timeline Impact: *+${timelineDeltaDays} days*\n\nPlease review and let us know if you would like to proceed!`
          : `Hi ${clientName},\n\nWe have prepared a formal Change Order proposal for "${title}".\n\n• Additional Budget: +${additionalBudget}\n• Additional Timeline: +${timelineDeltaDays} days\n\nPlease review this scope adjustment and let us know your thoughts!`,
    };
  }

  private renderChangeOrderApproved(
    channel: "email" | "whatsapp",
    vars: Record<string, unknown>,
  ): RenderedTemplate {
    const clientName = (vars.clientName as string) || "Client";
    const title = (vars.title as string) || "Change Order";

    return {
      subject: `Change Order Approved: ${title}`,
      bodyText: `Hi ${clientName},\n\nChange Order "${title}" has been approved. The project timeline, deliverables, and budget have been updated accordingly.`,
    };
  }
}

export const templateService = new TemplateService();
