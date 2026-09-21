import { z } from "zod";

export const sendEmailSchema = z.object({
  clientId: z.string().uuid("Invalid client ID format"),
  projectId: z.string().uuid("Invalid project ID format").optional(),
  invoiceId: z.string().uuid("Invalid invoice ID format").optional(),
  changeOrderId: z.string().uuid("Invalid change order ID format").optional(),
  recipientEmail: z.string().email("Invalid recipient email address").optional(),
  subject: z.string().max(500, "Subject exceeds 500 characters").optional(),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  templateKey: z.string().max(100).optional(),
  templateVariables: z.record(z.unknown()).optional(),
  idempotencyKey: z
    .string()
    .min(5, "Idempotency key must be at least 5 characters")
    .max(255),
});

export const sendWhatsAppSchema = z.object({
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
});

export type SendEmailPayload = z.infer<typeof sendEmailSchema>;
export type SendWhatsAppPayload = z.infer<typeof sendWhatsAppSchema>;
