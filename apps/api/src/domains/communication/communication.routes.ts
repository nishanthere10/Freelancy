import type { NextFunction, Request, Response } from "express";
import { type Router as ExpressRouter, Router } from "express";
import { z } from "zod";
import { createError } from "../../utils/response";
import {
  getClientPreferences,
  listMessages,
  sendEmail,
  sendWhatsApp,
  upsertClientPreferences,
} from "./communication.controller";
import {
  listMessagesQuerySchema,
  sendEmailSchema,
  sendWhatsAppSchema,
} from "./communication.schemas";

// ---------------------------------------------------------------------------
// Param schemas (exported for potential reuse in tests)
// ---------------------------------------------------------------------------

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export const clientPrefsParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  clientId: z.string().uuid("Invalid client ID"),
});

// Schema for PUT /clients/:clientId/preferences
const upsertPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  projectUpdates: z.boolean().optional(),
  invoiceNotifications: z.boolean().optional(),
  changeOrderNotifications: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Middleware helpers
// ---------------------------------------------------------------------------

function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json(
        createError(
          "VALIDATION_ERROR",
          "Invalid URL parameters",
          result.error.flatten().fieldErrors as Record<string, unknown>,
        ),
      );
      return;
    }
    req.params = result.data as typeof req.params;
    next();
  };
}

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(
        createError(
          "VALIDATION_ERROR",
          "Invalid request body",
          result.error.flatten().fieldErrors as Record<string, unknown>,
        ),
      );
      return;
    }
    req.body = result.data;
    next();
  };
}

function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json(
        createError(
          "VALIDATION_ERROR",
          "Invalid query parameters",
          result.error.flatten().fieldErrors as Record<string, unknown>,
        ),
      );
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router: ExpressRouter = Router({ mergeParams: true });

// Validate :workspaceId on all router requests
router.use(validateParams(workspaceParamsSchema));

// Outbound sends
router.post("/email", validateBody(sendEmailSchema), sendEmail);
router.post("/whatsapp", validateBody(sendWhatsAppSchema), sendWhatsApp);

// Message history
router.get("/messages", validateQuery(listMessagesQuerySchema), listMessages);

// Per-client notification preferences
router.get(
  "/clients/:clientId/preferences",
  validateParams(clientPrefsParamsSchema),
  getClientPreferences,
);
router.put(
  "/clients/:clientId/preferences",
  validateParams(clientPrefsParamsSchema),
  validateBody(upsertPreferencesSchema),
  upsertClientPreferences,
);

export default router;
