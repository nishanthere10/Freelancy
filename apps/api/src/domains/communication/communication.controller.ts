import type { NextFunction, Request, Response } from "express";
import { createError, createSuccess } from "../../utils/response";
import {
  ClientOptedOutError,
  CommunicationChannelDisabledError,
  CommunicationNotFoundError,
  CommunicationValidationError,
  InvalidRecipientError,
  ProviderDeliveryError,
} from "./communication.errors";
import type {
  ListMessagesQueryParams,
  SendEmailPayload,
  SendWhatsAppPayload,
} from "./communication.schemas";
import { CommunicationService } from "./communication.service";

// ---------------------------------------------------------------------------
// Service singleton — providers resolved from env at startup
// ---------------------------------------------------------------------------

const communicationService = new CommunicationService();

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

interface AuthRequest extends Request {
  user?: { id: string };
}

function getUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

// ---------------------------------------------------------------------------
// Error → HTTP mapping
// ---------------------------------------------------------------------------

function handleCommunicationError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof ClientOptedOutError) {
    res.status(422).json(createError("CLIENT_OPTED_OUT", err.message));
    return;
  }
  if (err instanceof CommunicationValidationError) {
    res.status(400).json(createError("VALIDATION_ERROR", err.message));
    return;
  }
  if (err instanceof CommunicationChannelDisabledError) {
    res
      .status(422)
      .json(createError("CHANNEL_DISABLED", err.message));
    return;
  }
  if (err instanceof InvalidRecipientError) {
    res
      .status(422)
      .json(createError("INVALID_RECIPIENT", err.message));
    return;
  }
  if (err instanceof CommunicationNotFoundError) {
    res
      .status(404)
      .json(createError("NOT_FOUND", err.message));
    return;
  }
  if (err instanceof ProviderDeliveryError) {
    res
      .status(502)
      .json(
        createError(
          "PROVIDER_DELIVERY_ERROR",
          err.message,
        ),
      );
    return;
  }
  next(err);
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/workspaces/:workspaceId/communications/email
 */
export async function sendEmail(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json(createError("UNAUTHORIZED", "Authentication required"));
      return;
    }

    const body = req.body as SendEmailPayload;
    const message = await communicationService.sendEmail({
      workspaceId,
      actorId: userId,
      ...body,
    });

    res.status(201).json(createSuccess(message));
  } catch (err) {
    handleCommunicationError(err, res, next);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/communications/whatsapp
 */
export async function sendWhatsApp(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json(createError("UNAUTHORIZED", "Authentication required"));
      return;
    }

    const body = req.body as SendWhatsAppPayload;
    const message = await communicationService.sendWhatsApp({
      workspaceId,
      actorId: userId,
      ...body,
    });

    res.status(201).json(createSuccess(message));
  } catch (err) {
    handleCommunicationError(err, res, next);
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/communications/messages
 */
export async function listMessages(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const query = req.query as unknown as ListMessagesQueryParams;

    const messages = await communicationService.listMessages(
      workspaceId,
      query,
    );

    res
      .status(200)
      .json(createSuccess(messages));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/communications/clients/:clientId/preferences
 */
export async function getClientPreferences(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { workspaceId, clientId } = req.params as {
      workspaceId: string;
      clientId: string;
    };

    const prefs = await communicationService.getClientPreferences(
      workspaceId,
      clientId,
    );

    if (!prefs) {
      // Return sensible defaults when not yet explicitly set
      res.status(200).json(
        createSuccess({
          emailEnabled: true,
          whatsappEnabled: true,
          projectUpdates: true,
          invoiceNotifications: true,
          changeOrderNotifications: true,
        }),
      );
      return;
    }

    res.status(200).json(createSuccess(prefs));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/workspaces/:workspaceId/communications/clients/:clientId/preferences
 */
export async function upsertClientPreferences(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { workspaceId, clientId } = req.params as {
      workspaceId: string;
      clientId: string;
    };

    const body = req.body as {
      emailEnabled?: boolean;
      whatsappEnabled?: boolean;
      projectUpdates?: boolean;
      invoiceNotifications?: boolean;
      changeOrderNotifications?: boolean;
    };

    const result = await communicationService.upsertClientPreferences(
      workspaceId,
      clientId,
      body,
    );

    res
      .status(200)
      .json(createSuccess(result));
  } catch (err) {
    next(err);
  }
}
