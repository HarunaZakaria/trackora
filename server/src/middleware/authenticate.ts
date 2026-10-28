import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env";
import { HttpError } from "../lib/errors";
import { AuthSession, Business, Membership, User } from "../models";

type AccessClaims = jwt.JwtPayload & { sid: string };

export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  try {
    const header = request.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
      throw new HttpError(401, "Authentication is required.", "AUTH_REQUIRED");

    const claims = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessClaims;
    if (
      !claims.sub ||
      !Types.ObjectId.isValid(claims.sub) ||
      !Types.ObjectId.isValid(claims.sid)
    ) {
      throw new HttpError(401, "The access token is invalid.", "INVALID_TOKEN");
    }
    const sessionId = new Types.ObjectId(claims.sid);
    const userId = new Types.ObjectId(claims.sub);
    const session = await AuthSession.findOne({
      _id: sessionId,
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!session)
      throw new HttpError(
        401,
        "This session has expired or was revoked.",
        "SESSION_REVOKED",
      );

    const user = await User.findOne({ _id: userId, status: "active" });
    if (!user)
      throw new HttpError(
        401,
        "This account is unavailable.",
        "ACCOUNT_DISABLED",
      );

    if (user.platformRole === "super-admin") {
      request.auth = {
        userId,
        businessId: null,
        membershipId: null,
        role: "super-admin",
        platformRole: "super-admin",
        sessionId,
      };
      next();
      return;
    }

    if (!session.businessId || !session.membershipId) {
      throw new HttpError(
        403,
        "This session has no business membership.",
        "MEMBERSHIP_REQUIRED",
      );
    }
    const [business, membership] = await Promise.all([
      Business.findOne({ _id: session.businessId, status: "active" }),
      Membership.findOne({
        _id: session.membershipId,
        userId,
        businessId: session.businessId,
        status: "active",
      }),
    ]);
    if (!business || !membership) {
      await AuthSession.updateOne(
        { _id: sessionId },
        { $set: { revokedAt: new Date() } },
      );
      throw new HttpError(
        403,
        "Business access is unavailable.",
        "BUSINESS_ACCESS_DISABLED",
      );
    }
    request.auth = {
      userId,
      businessId: business._id,
      membershipId: membership._id,
      role: membership.role,
      platformRole: "user",
      sessionId,
    };
    next();
  } catch (error) {
    next(
      error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError
        ? new HttpError(
            401,
            "The access token is invalid or expired.",
            "INVALID_TOKEN",
          )
        : error,
    );
  }
};

export const requireBusiness: RequestHandler = (request, _response, next) => {
  if (!request.auth?.businessId) {
    next(
      new HttpError(
        403,
        "A business membership is required.",
        "BUSINESS_REQUIRED",
      ),
    );
    return;
  }
  next();
};
