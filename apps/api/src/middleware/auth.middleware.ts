import { clerkMiddleware, getAuth } from "@clerk/express";
import { usersTable } from "@repo/database";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { db } from "../db/client";
import { logger } from "../utils/logger";

export interface AuthUser {
  id: string; // Internal UUID
  clerkId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const clerkAuth: RequestHandler = (req, res, next) => {
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (publishableKey && secretKey) {
    try {
      // clerkMiddleware() wraps an async function in a sync wrapper that
      // discards the returned Promise. Express 4.x cannot handle unhandled
      // Promise rejections — in Cloudflare Workers this causes a bare 500
      // with no CORS headers or error body. We catch the Promise explicitly.
      const result: unknown = clerkMiddleware({ publishableKey, secretKey })(
        req,
        res,
        next,
      );
      if (
        result &&
        typeof (result as { catch?: (fn: (err: unknown) => void) => void })
          .catch === "function"
      ) {
        (result as { catch: (fn: (err: unknown) => void) => void }).catch(
          (err: unknown) => {
            logger.error("clerkMiddleware async rejection", { error: err });
            next(err);
          },
        );
      }
    } catch (err) {
      logger.error("clerkMiddleware sync exception", { error: err });
      next(err);
    }
    return;
  }
  return next();
};

export async function userResolverMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const allowMock =
      process.env.ENABLE_MOCK_AUTH === "true" ||
      process.env.NODE_ENV === "test";
    const mockAuthHeader = req.headers["x-mock-user-id"] as string | undefined;

    // Short-circuit in mock auth / test mode without calling Clerk getAuth(req)
    if (!isProd && allowMock) {
      const mockId = mockAuthHeader || "550e8400-e29b-41d4-a716-446655440000";
      req.user = {
        id: mockId,
        clerkId: `mock_clerk_${mockId}`,
        email: "dev@freelance-os.local",
      };
      return next();
    }

    // In production, inspect Clerk authentication session.
    // getAuth() reads req.auth set by clerkMiddleware — no stream access.
    let auth: ReturnType<typeof getAuth> | null = null;
    try {
      auth = getAuth(req);
    } catch (_err) {
      auth = null;
    }

    if (!auth || !auth.userId) {
      const requestId = req.id || (req.headers["x-request-id"] as string);
      logger.warn("Unauthenticated API request rejected", {
        requestId,
        path: req.path,
        method: req.method,
      });

      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication required",
        requestId,
      });
    }

    const clerkId = auth.userId;

    // Resolve user in internal PostgreSQL DB
    let user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId))
      .then((rows) => rows[0]);

    if (!user) {
      // JIT (Just-In-Time) User Provisioning
      const fallbackEmail = `${clerkId}@user.clerk.dev`;
      try {
        const [newUser] = await db
          .insert(usersTable)
          .values({
            clerkId,
            email: fallbackEmail,
            status: "active",
          })
          .onConflictDoNothing()
          .returning();

        if (newUser) {
          user = newUser;
        } else {
          user = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.clerkId, clerkId))
            .then((rows) => rows[0]);
        }
      } catch (_err) {
        user = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.clerkId, clerkId))
          .then((rows) => rows[0]);
      }
    }

    if (user.status !== "active") {
      const requestId = req.id || (req.headers["x-request-id"] as string);
      logger.warn(`Deactivated user access blocked: ${user.id}`, {
        requestId,
        userId: user.id,
      });

      return res.status(401).json({
        success: false,
        error: "USER_INACTIVE",
        message: "User account has been deactivated",
        requestId,
      });
    }

    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
    };

    next();
  } catch (error) {
    logger.error("User resolution middleware error", {
      requestId: req.id,
      error,
    });
    next(error);
  }
}
