import { clerkMiddleware, getAuth } from "@clerk/express";
import { usersTable } from "@repo/database";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { db } from "../db/client";

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
    // WORKAROUND: Cloudflare Workers crash with "stream is not readable" if a Node.js 
    // Readable stream is passed as the body to the Web Request constructor.
    // By temporarily spoofing the method to GET, Clerk won't attach the body to the Request.
    const originalMethod = req.method;
    req.method = "GET";
    
    return clerkMiddleware({ publishableKey, secretKey })(req, res, (err) => {
      req.method = originalMethod;
      next(err);
    });
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

    // In production, safely inspect Clerk authentication session
    let auth: ReturnType<typeof getAuth> | null = null;
    try {
      auth = getAuth(req);
    } catch (_err) {
      auth = null;
    }

    if (!auth || !auth.userId) {
      // Unauthenticated request - gracefully return 401 Unauthorized JSON
      return res.status(401).json({ error: "Unauthorized" });
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
      return res.status(401).json({
        success: false,
        error: {
          code: "USER_INACTIVE",
          message: "User account has been deactivated",
        },
      });
    }

    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("User resolution middleware error:", error);
    next(error);
  }
}
