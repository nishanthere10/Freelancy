import { z } from "zod";

export const sendEmailSchema = z
  .object({
    clientId: z.string().uuid("Invalid client ID format"),
    projectId: z.string().uuid("Invalid project ID format").optional(),
    invoiceId: z.string().uuid("Invalid invoice ID format").optional(),
    changeOrderId: z.string().uuid("Invalid change order ID format").optional(),
    recipientEmail: z.string().email("Invalid recipient email address").optional(),
    subject: z
      .string()
      .max(500, "Subject exceeds 500 characters")
      .optional(),
    bodyText: z.string().optional(),
    bodyHtml: z.string().optional(),
    templateKey: z.string().max(100).optional(),
    templateVariables: z.record(z.unknown()).optional(),
    idempotencyKey: z
      .string()
      .min(5, "Idempotency key must be at least 5 characters")
      .max(255),
  })
  .refine(
    (data) => Boolean(data.templateKey || (data.subject && data.bodyText)),
    {
      message:
        "Either templateKey or both subject and bodyText must be provided",
      path: ["subject"],
    },
  );

export const sendWhatsAppSchema = z
  .object({
    clientId: z.string().uuid("Invalid client ID format"),
    projectId: z.string().uuid("Invalid project ID format").optional(),
    invoiceId: z.string().uuid("Invalid invoice ID format").optional(),
    changeOrderId: z.string().uuid("Invalid change order ID format").optional(),
    recipientPhone: z
      .string()
      .min(8, "Phone number must be at least 8 characters")
      .max(50)
      .optional(),
    messageText: z
      .string()
      .max(4096, "WhatsApp message exceeds 4096 characters")
      .optional(),
    templateKey: z.string().max(100).optional(),
    templateVariables: z.record(z.unknown()).optional(),
    idempotencyKey: z
      .string()
      .min(5, "Idempotency key must be at least 5 characters")
      .max(255),
  })
  .refine(
    (data) => Boolean(data.templateKey || data.messageText),
    {
      message: "Either templateKey or messageText must be provided",
      path: ["messageText"],
    },
  );

export const listMessagesQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  changeOrderId: z.string().uuid().optional(),
  channel: z.enum(["email", "whatsapp"]).optional(),
  direction: z.enum(["outbound", "inbound"]).optional(),
  status: z
    .enum([
      "queued",
      "sending",
      "sent",
      "delivered",
      "read",
      "received",
      "failed",
      "bounced",
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateChannelSchema = z.object({
  status: z.enum(["active", "inactive", "error"]),
  senderIdentity: z.string().max(255).optional(),
  displayName: z.string().max(255).optional(),
  config: z.record(z.unknown()).optional(),
});

export const renderTemplateSchema = z.object({
  templateKey: z.enum([
    "invoice.created",
    "invoice.due",
    "invoice.overdue",
    "payment.received",
    "project.started",
    "project.progress",
    "change_order.proposed",
    "change_order.approved",
  ]),
  channel: z.enum(["email", "whatsapp"]),
  variables: z.record(z.unknown()),
});

export type SendEmailPayload = z.infer<typeof sendEmailSchema>;
export type SendWhatsAppPayload = z.infer<typeof sendWhatsAppSchema>;
export type ListMessagesQueryParams = z.infer<typeof listMessagesQuerySchema>;
export type UpdateChannelPayload = z.infer<typeof updateChannelSchema>;
export type RenderTemplatePayload = z.infer<typeof renderTemplateSchema>;
