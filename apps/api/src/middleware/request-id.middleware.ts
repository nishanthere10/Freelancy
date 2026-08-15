import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Generate a cryptographically secure random request identifier
 */
function generateRequestId(): string {
  if (typeof crypto.randomUUID === "function") {
    return `req_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Request ID Middleware
 * Assigns or propagates a unique correlation identifier across all inbound HTTP requests.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const rawHeader = req.headers["x-request-id"];
  const incomingId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  // Validate incoming ID format (prevent header injection or oversized values)
  const isValidIncoming =
    incomingId &&
    typeof incomingId === "string" &&
    incomingId.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(incomingId);

  const requestId = isValidIncoming ? incomingId : generateRequestId();

  req.id = requestId;
  res.setHeader("x-request-id", requestId);

  next();
}
