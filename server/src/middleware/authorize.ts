import type { RequestHandler } from "express";
import { HttpError } from "../lib/errors";

export function allowRoles(...roles: string[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      next(
        new HttpError(
          403,
          "You do not have permission to perform this action.",
          "FORBIDDEN",
        ),
      );
      return;
    }
    next();
  };
}

export const requireSuperAdmin: RequestHandler = (request, _response, next) => {
  if (request.auth?.platformRole !== "super-admin") {
    next(
      new HttpError(
        403,
        "Platform administrator access is required.",
        "ADMIN_REQUIRED",
      ),
    );
    return;
  }
  next();
};
