import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

/**
 * Request Logging Middleware
 * Captures request timing and emits structured completion logs with status and latency.
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();
  const requestId = req.id || (req.headers["x-request-id"] as string);

  // Hook into response completion
  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const { method, originalUrl, path } = req;
    const status = res.statusCode;

    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      "unknown-client";

    const context = {
      requestId,
      method,
      path: originalUrl || path,
      status,
      durationMs,
      ip: clientIp,
      userAgent: req.headers["user-agent"],
      userId: (req as Request & { user?: { id: string } }).user?.id,
    };

    const isHealthEndpoint =
      path === "/health" || path === "/health/ready" || path === "/version";

    if (status >= 500) {
      logger.error(
        `HTTP ${method} ${path} failed with status ${status}`,
        context,
      );
    } else if (status >= 400) {
      logger.warn(
        `HTTP ${method} ${path} responded with status ${status}`,
        context,
      );
    } else if (isHealthEndpoint) {
      // Keep normal health checks at debug level to avoid log noise
      logger.debug(
        `HTTP ${method} ${path} ${status} (${durationMs}ms)`,
        context,
      );
    } else {
      logger.info(
        `HTTP ${method} ${path} ${status} (${durationMs}ms)`,
        context,
      );
    }
  });

  next();
}
