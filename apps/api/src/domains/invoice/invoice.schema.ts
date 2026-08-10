import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Item description is required"),
  quantity: z
    .union([z.number(), z.string()])
    .transform((val) => String(val))
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      "Quantity must be greater than 0",
    )
    .optional()
    .default("1.00"),
  unitPrice: z
    .union([z.number(), z.string()])
    .transform((val) => String(val))
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0,
      "Unit price must be non-negative",
    )
    .optional()
    .default("0.00"),
  sortOrder: z.number().int().optional(),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  projectId: z.string().uuid("Invalid project ID").optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter ISO code")
    .optional()
    .default("INR"),
  discountRate: z
    .union([z.number(), z.string()])
    .transform((val) => String(val))
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
      "Discount rate must be between 0 and 100",
    )
    .optional()
    .default("0.00"),
  taxRate: z
    .union([z.number(), z.string()])
    .transform((val) => String(val))
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
      "Tax rate must be between 0 and 100",
    )
    .optional()
    .default("18.00"),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z
    .array(invoiceItemSchema)
    .min(1, "At least one line item is required"),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const sendInvoiceSchema = z.object({
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export const recordPaymentSchema = z.object({
  amountPaid: z
    .union([z.number(), z.string()])
    .transform((val) => String(val))
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      "Amount paid must be greater than 0",
    ),
  paymentMethod: z.string().optional().nullable(),
  paymentReference: z.string().optional().nullable(),
  paidAt: z.string().optional().nullable(),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().optional(),
});

export const invoiceQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  status: z
    .enum(["all", "draft", "sent", "paid", "overdue", "cancelled"])
    .optional(),
  search: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;
export type InvoiceQueryParams = z.infer<typeof invoiceQuerySchema>;
