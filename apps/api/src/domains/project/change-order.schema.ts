import { z } from "zod";

export const changeOrderParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  projectId: z.string().uuid("Invalid project ID"),
  changeOrderId: z.string().uuid("Invalid change order ID").optional(),
});

export const changeOrderIdParamSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  projectId: z.string().uuid("Invalid project ID"),
  changeOrderId: z.string().uuid("Invalid change order ID"),
});

export const moneySchema = z
  .union([z.number(), z.string()])
  .transform((val) => String(val).trim())
  .refine(
    (val) => !Number.isNaN(Number(val)) && Number(val) >= 0,
    "Amount must be non-negative",
  )
  .refine(
    (val) => Number(val) <= 999999999.99,
    "Amount must not exceed 999,999,999.99",
  )
  .refine(
    (val) => /^\d+(\.\d{1,2})?$/.test(val),
    "Amount must have at most 2 decimal places",
  );

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

export const proposedDeliverableItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters"),
  description: z.string().trim().max(5000).optional().nullable(),
  estimatedHours: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine(
      (val) => !Number.isNaN(val) && val >= 0,
      "Hours must be non-negative",
    ),
  complexity: z.enum(["low", "medium", "high"]).optional().default("medium"),
});

export const createChangeOrderSchema = z.object({
  scopeAnalysisId: z.string().uuid("Invalid scope analysis ID"),
  driftAnalysisId: z
    .string()
    .uuid("Invalid drift analysis ID")
    .optional()
    .nullable(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters"),
  description: z.string().trim().max(5000).optional().nullable(),
  additionalBudget: moneySchema.default("0.00"),
  additionalHours: hoursSchema.default("0.00"),
  timelineDeltaDays: z
    .number()
    .int()
    .nonnegative("Timeline delta must be non-negative")
    .default(0),
  proposedDeliverables: z
    .array(proposedDeliverableItemSchema)
    .min(1, "At least one deliverable must be proposed for a change order"),
});

export const updateChangeOrderDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters")
    .optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  additionalBudget: moneySchema.optional(),
  additionalHours: hoursSchema.optional(),
  timelineDeltaDays: z.number().int().nonnegative().optional(),
  proposedDeliverables: z
    .array(proposedDeliverableItemSchema)
    .min(1)
    .optional(),
});

export const approveChangeOrderSchema = z.object({
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
