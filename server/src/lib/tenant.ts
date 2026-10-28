import type { Request } from "express";
import { Types } from "mongoose";
import { HttpError } from "./errors";

export function businessIdFrom(request: Request) {
  const businessId = request.auth?.businessId;
  if (!businessId)
    throw new HttpError(
      403,
      "An active business membership is required.",
      "BUSINESS_REQUIRED",
    );
  return businessId;
}

export function objectId(value: unknown) {
  if (typeof value !== "string" || !Types.ObjectId.isValid(value)) {
    throw new HttpError(404, "Resource not found.", "NOT_FOUND");
  }
  return new Types.ObjectId(value);
}

export function toMinor(value: number) {
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromMinor(value: number) {
  return value / 100;
}

export function paginatedQuery(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
