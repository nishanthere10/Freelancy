import type { NextFunction, Request, Response } from "express";
import { type Router as ExpressRouter, Router } from "express";
import { z } from "zod";
import { createError } from "../../utils/response";
import { requireWorkspaceRole } from "../../middleware/rbac.middleware";
import {
  getClientPreferences,
  getClientThread,
  getMessage,
  listChannels,
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

export const messageParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  messageId: z.string().uuid("Invalid message ID"),
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

// Outbound sends (Requires editor role)
router.post(
  "/email",
  requireWorkspaceRole("editor"),
  validateBody(sendEmailSchema),
  sendEmail,
);
router.post(
  "/whatsapp",
  requireWorkspaceRole("editor"),
  validateBody(sendWhatsAppSchema),
  sendWhatsApp,
);

// Message history (Requires viewer role)
router.get(
  "/messages",
  requireWorkspaceRole("viewer"),
  validateQuery(listMessagesQuerySchema),
  listMessages,
);
router.get(
  "/messages/:messageId",
  requireWorkspaceRole("viewer"),
  validateParams(messageParamsSchema),
  getMessage,
);

// Client thread (Requires viewer role)
router.get(
  "/clients/:clientId/thread",
  requireWorkspaceRole("viewer"),
  validateParams(clientPrefsParamsSchema),
  getClientThread,
);

// Workspace channels (Requires viewer role)
router.get(
  "/channels",
  requireWorkspaceRole("viewer"),
  listChannels,
);

// Per-client notification preferences
router.get(
  "/clients/:clientId/preferences",
  requireWorkspaceRole("viewer"),
  validateParams(clientPrefsParamsSchema),
  getClientPreferences,
);
router.put(
  "/clients/:clientId/preferences",
  requireWorkspaceRole("editor"),
  validateParams(clientPrefsParamsSchema),
  validateBody(upsertPreferencesSchema),
  upsertClientPreferences,
);

export default router;
