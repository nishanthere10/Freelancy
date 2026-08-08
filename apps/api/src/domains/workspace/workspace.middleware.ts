/**
 * Request validation middleware for workspace routes
 */

import { createError } from "@/utils/response";
import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

/**
 * Validates request body against Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const details = result.error.flatten().fieldErrors;
        return res
          .status(400)
          .json(
            createError(
              "VALIDATION_ERROR",
              "Request validation failed",
              details,
            ),
          );
      }

      // Replace req.body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validates request params against Zod schema
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const details = result.error.flatten().fieldErrors;
        return res
          .status(400)
          .json(
            createError(
              "VALIDATION_ERROR",
              "Parameter validation failed",
              details,
            ),
          );
      }

      // Cast validated data to params (safe after Zod validation)
      Object.assign(req.params, result.data);
      next();
    } catch (error) {
      next(error);
    }
  };
}

