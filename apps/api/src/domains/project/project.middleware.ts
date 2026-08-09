import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { createError } from "../../utils/response";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const details = result.error.flatten().fieldErrors;
        return res
          .status(400)
          .json(
            createError("VALIDATION_ERROR", "Request validation failed", details),
          );
      }
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        const details = result.error.flatten().fieldErrors;
        return res
          .status(400)
          .json(
            createError("VALIDATION_ERROR", "Parameter validation failed", details),
          );
      }
      Object.assign(req.params, result.data);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        const details = result.error.flatten().fieldErrors;
        return res
          .status(400)
          .json(
            createError("VALIDATION_ERROR", "Query validation failed", details),
          );
      }
      req.query = result.data as Record<string, string>;
      next();
    } catch (error) {
      next(error);
    }
  };
}
