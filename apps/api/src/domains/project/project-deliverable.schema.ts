import { z } from "zod";

export const projectDeliverableParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  projectId: z.string().uuid("Invalid project ID"),
  deliverableId: z.string().uuid("Invalid deliverable ID").optional(),
});

export const hoursSchema = z
  .union([z.number(), z.string()])
  .transform((val) => String(val).trim())
  .refine(
    (val) => !Number.isNaN(Number(val)) && Number(val) >= 0,
    "Hours must be non-negative",
  )
  .refine((val) => Number(val) <= 9999.99, "Hours must not exceed 9999.99")
  .refine(
    (val) => /^\d+(\.\d{1,2})?$/.test(val),
    "Hours must have at most 2 decimal places",
  );

export const createProjectDeliverableSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters"),
  description: z.string().trim().max(5000).optional().nullable(),
  estimatedHours: hoursSchema.optional().default("0.00"),
  complexity: z.enum(["low", "medium", "high"]).optional().default("medium"),
  position: z.number().int().nonnegative().optional().default(0),
});

export const updateProjectDeliverableSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters")
    .optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  estimatedHours: hoursSchema.optional(),
  loggedHours: hoursSchema.optional(),
  complexity: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  position: z.number().int().nonnegative().optional(),
});

export const createProgressInvoiceSchema = z.object({
  deliverableIds: z
    .array(z.string().uuid("Invalid deliverable ID"))
    .min(1, "At least one deliverable must be selected for progress invoicing")
    .max(100, "Cannot invoice more than 100 deliverables at once"),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  discountRate: z
    .union([z.number(), z.string()])
    .transform((val) => String(val).trim())
    .refine(
      (val) =>
        !Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
      "Discount rate must be between 0 and 100",
    )
    .optional()
    .default("0.00"),
  taxRate: z
    .union([z.number(), z.string()])
    .transform((val) => String(val).trim())
    .refine(
      (val) =>
        !Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
      "Tax rate must be between 0 and 100",
    )
    .optional()
    .default("18.00"),
});

export type CreateProjectDeliverableInput = z.infer<
  typeof createProjectDeliverableSchema
>;
export type UpdateProjectDeliverableInput = z.infer<
  typeof updateProjectDeliverableSchema
>;
export type CreateProgressInvoiceInput = z.infer<
  typeof createProgressInvoiceSchema
>;
