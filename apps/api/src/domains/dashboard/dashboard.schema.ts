import { z } from "zod";

export const getDashboardSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID format"),
});

export type GetDashboardParams = z.infer<typeof getDashboardSchema>;
