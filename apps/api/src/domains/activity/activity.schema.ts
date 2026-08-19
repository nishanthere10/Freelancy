import { z } from "zod";

export const activityQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
  cursor: z.string().optional(),
  entityType: z
    .enum(["workspace", "client", "project", "invoice", "member"])
    .optional(),
  entityId: z.string().uuid("Invalid entity ID").optional(),
  actorUserId: z.string().uuid("Invalid actor user ID").optional(),
});

export type ActivityQueryParams = z.infer<typeof activityQuerySchema>;
