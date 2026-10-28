import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { HttpError } from "../lib/errors";
import { env } from "../config/env";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      message: "Request validation failed.",
      code: "VALIDATION_ERROR",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    response
      .status(400)
      .json({
        success: false,
        message: "Request data is invalid.",
        code: "INVALID_DATA",
      });
    return;
  }
  if (isMongoDuplicate(error)) {
    response
      .status(409)
      .json({
        success: false,
        message: "A record with the same unique value already exists.",
        code: "DUPLICATE_RECORD",
      });
    return;
  }
  if (error instanceof HttpError) {
    response
      .status(error.status)
      .json({ success: false, message: error.message, code: error.code });
    return;
  }
  if (isStatusError(error)) {
    response
      .status(error.status)
      .json({
        success: false,
        message:
          error.status === 413
            ? "Request body is too large."
            : "Request could not be processed.",
        code: error.status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_REQUEST",
      });
    return;
  }
  console.error(error);
  response.status(500).json({
    success: false,
    message:
      env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    code: "INTERNAL_ERROR",
  });
};

function isMongoDuplicate(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function isStatusError(error: unknown): error is { status: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  );
}
