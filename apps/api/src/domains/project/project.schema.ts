import { z } from "zod";

export const projectPricingModelEnum = z.enum(["fixed", "hourly", "retainer"]);
export const projectStatusEnum = z.enum(["draft", "active", "completed", "archived"]);

export const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Project name is required")
      .max(255, "Project name must not exceed 255 characters"),
    clientId: z
      .string()
      .uuid("Invalid client ID")
      .nullable()
      .optional()
      .transform((val) => val || null),
    description: z
      .string()
      .trim()
      .max(5000, "Description must not exceed 5000 characters")
      .nullable()
      .optional()
      .transform((val) => val || null),
    pricingModel: projectPricingModelEnum.default("fixed"),
    budgetCurrency: z
      .string()
      .trim()
      .length(3, "Currency code must be 3 letters")
      .default("INR"),
    budgetAmount: z
      .number()
      .min(0, "Budget amount must be positive")
      .nullable()
      .optional()
      .transform((val) => (val !== undefined ? val : null)),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD")
      .nullable()
      .optional()
      .transform((val) => val || null),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Target date must be YYYY-MM-DD")
      .nullable()
      .optional()
      .transform((val) => val || null),
  })
  .refine(
    (data) => {
      if (data.startDate && data.targetDate) {
        return new Date(data.targetDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "Target completion date cannot be before start date",
      path: ["targetDate"],
    },
  );

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Project name is required")
      .max(255, "Project name must not exceed 255 characters")
      .optional(),
    clientId: z
      .string()
      .uuid("Invalid client ID")
      .nullable()
      .optional(),
    description: z
      .string()
      .trim()
      .max(5000, "Description must not exceed 5000 characters")
      .nullable()
      .optional(),
    pricingModel: projectPricingModelEnum.optional(),
    budgetCurrency: z
      .string()
      .trim()
      .length(3, "Currency code must be 3 letters")
      .optional(),
    budgetAmount: z
      .number()
      .min(0, "Budget amount must be positive")
      .nullable()
      .optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD")
      .nullable()
      .optional(),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Target date must be YYYY-MM-DD")
      .nullable()
      .optional(),
    status: projectStatusEnum.optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.startDate && data.targetDate) {
        return new Date(data.targetDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "Target completion date cannot be before start date",
      path: ["targetDate"],
    },
  );

export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;

export const changeProjectStatusSchema = z.object({
  status: projectStatusEnum,
});

export type ChangeProjectStatusRequest = z.infer<typeof changeProjectStatusSchema>;

export const projectParamsSchema = z.object({
  workspaceId: z.string().uuid("Workspace ID must be a valid UUID"),
  projectId: z.string().uuid("Project ID must be a valid UUID").optional(),
});

export const listProjectsQuerySchema = z.object({
  status: z
    .enum(["draft", "active", "completed", "archived", "all"])
    .default("active"),
  clientId: z
    .string()
    .uuid("Client ID must be a valid UUID")
    .optional(),
  excludeDeleted: z
    .string()
    .optional()
    .transform((val) => val !== "false"),
  search: z.string().optional(),
});
