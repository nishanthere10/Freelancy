import { z } from "zod";

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const createClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Client name is required")
    .max(255, "Client name must not exceed 255 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must not exceed 255 characters"),
  phone: z
    .string()
    .trim()
    .max(50, "Phone must not exceed 50 characters")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  website: z
    .string()
    .trim()
    .url("Website must be a valid URL")
    .max(255, "Website must not exceed 255 characters")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  companyName: z
    .string()
    .trim()
    .max(255, "Company name must not exceed 255 characters")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  gstNumber: z
    .string()
    .trim()
    .regex(gstRegex, "Invalid GST format")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  contactPerson: z
    .string()
    .trim()
    .max(255, "Contact person must not exceed 255 characters")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  department: z
    .string()
    .trim()
    .max(255, "Department must not exceed 255 characters")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  address: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  city: z
    .string()
    .trim()
    .max(100, "City must not exceed 100 characters")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  state: z
    .string()
    .trim()
    .max(100, "State must not exceed 100 characters")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  postalCode: z
    .string()
    .trim()
    .max(20, "Postal code must not exceed 20 characters")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
  country: z
    .string()
    .trim()
    .max(100, "Country must not exceed 100 characters")
    .optional()
    .nullable()
    .transform((val) => val || undefined),
});

export type CreateClientRequest = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema
  .partial()
  .extend({
    status: z.enum(["active", "inactive", "archived"]).optional(),
  })
  .strict();

export type UpdateClientRequest = z.infer<typeof updateClientSchema>;

export const clientParamsSchema = z.object({
  workspaceId: z.string().uuid("Workspace ID must be a valid UUID"),
  clientId: z.string().uuid("Client ID must be a valid UUID").optional(),
});

export const listClientsQuerySchema = z.object({
  status: z.enum(["active", "inactive", "archived", "all"]).default("active"),
  excludeDeleted: z
    .string()
    .optional()
    .transform((val) => val !== "false"),
  search: z.string().optional(),
});
