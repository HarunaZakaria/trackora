import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../lib/errors";

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(
        new HttpError(400, "Request validation failed.", "VALIDATION_ERROR"),
      );
      return;
    }
    request.body = result.data;
    next();
  };
}
