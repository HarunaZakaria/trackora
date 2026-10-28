import { randomBytes } from "node:crypto";
import { Router } from "express";
import { compare, hash } from "bcryptjs";
import { Types } from "mongoose";
import { z } from "zod";
import { env } from "../config/env";
import { asyncHandler } from "../lib/async-handler";
import { HttpError } from "../lib/errors";
import {
  createSession,
  hashToken,
  REFRESH_COOKIE,
  refreshCookieOptions,
} from "../lib/tokens";
import { authenticate } from "../middleware/authenticate";
import {
  AuthSession,
  Business,
  Membership,
  PasswordReset,
  User,
} from "../models";
import { recordAudit } from "../services/audit";
import { sendPasswordReset } from "../services/email";

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  businessName: z.string().trim().min(2).max(120),
  businessType: z.string().trim().max(80).optional(),
  currency: z.string().trim().length(3).default("GHS"),
});
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
  businessId: z.string().optional(),
});
const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(12).max(128),
});

function safeUser(user: {
  _id: Types.ObjectId;
  name: string;
  email: string;
  platformRole: string;
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    platformRole: user.platformRole,
  };
}

async function issueSession(
  response: import("express").Response,
  userId: Types.ObjectId,
  businessId: Types.ObjectId | null,
  membershipId: Types.ObjectId | null,
) {
  const issued = await createSession(userId, businessId, membershipId);
  response.cookie(REFRESH_COOKIE, issued.refreshToken, refreshCookieOptions());
  return {
    accessToken: issued.accessToken,
    expiresIn: env.ACCESS_TOKEN_TTL,
    businessId: businessId?.toString() ?? null,
    role: membershipId
      ? ((await Membership.findById(membershipId))?.role ?? "owner")
      : "super-admin",
  };
}

router.post(
  "/register",
  asyncHandler(async (request, response) => {
    const input = registerSchema.parse(request.body);
    const session = await Business.startSession();
    let created:
      | {
          user: InstanceType<typeof User>;
          business: InstanceType<typeof Business>;
          membership: InstanceType<typeof Membership>;
        }
      | undefined;
    try {
      created = await session.withTransaction(async () => {
        const [user] = await User.create(
          [
            {
              name: input.name,
              email: input.email.toLowerCase(),
              passwordHash: await hash(input.password, 12),
            },
          ],
          { session },
        );
        const [business] = await Business.create(
          [
            {
              name: input.businessName,
              businessType: input.businessType ?? "retail",
              ownerId: user._id,
              currency: input.currency.toUpperCase(),
            },
          ],
          { session },
        );
        const [membership] = await Membership.create(
          [
            {
              businessId: business._id,
              userId: user._id,
              role: "owner",
            },
          ],
          { session },
        );
        return { user, business, membership };
      });
    } finally {
      await session.endSession();
    }
    if (!created)
      throw new HttpError(
        500,
        "Account registration failed.",
        "REGISTRATION_FAILED",
      );
    const auth = await issueSession(
      response,
      created.user._id,
      created.business._id,
      created.membership._id,
    );
    await recordAudit({
      businessId: created.business._id,
      userId: created.user._id,
      action: "business.registered",
      entityType: "business",
      entityId: created.business._id,
    });
    response.status(201).json({
      success: true,
      message: "Business registered successfully.",
      data: {
        user: safeUser(created.user),
        business: {
          id: created.business._id.toString(),
          name: created.business.name,
          currency: created.business.currency,
        },
        ...auth,
      },
    });
  }),
);

router.post(
  "/login",
  asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await User.findOne({
      email: input.email.toLowerCase(),
    }).select("+passwordHash");
    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new HttpError(
        401,
        "Email or password is incorrect.",
        "INVALID_CREDENTIALS",
      );
    }
    if (user.status !== "active")
      throw new HttpError(403, "This account is disabled.", "ACCOUNT_DISABLED");
    let businessId: Types.ObjectId | null = null;
    let membershipId: Types.ObjectId | null = null;
    if (user.platformRole !== "super-admin") {
      const filter: Record<string, unknown> = {
        userId: user._id,
        status: "active",
      };
      if (input.businessId) {
        if (!Types.ObjectId.isValid(input.businessId))
          throw new HttpError(400, "Business ID is invalid.", "INVALID_ID");
        filter.businessId = new Types.ObjectId(input.businessId);
      }
      const memberships = await Membership.find(filter).sort({ createdAt: 1 });
      const eligible = await Business.find({
        _id: { $in: memberships.map((item) => item.businessId) },
        status: "active",
      }).select("_id");
      const eligibleIds = new Set(eligible.map((item) => item._id.toString()));
      const membership = memberships.find((item) =>
        eligibleIds.has(item.businessId.toString()),
      );
      if (!membership)
        throw new HttpError(
          403,
          "No active business membership was found.",
          "MEMBERSHIP_REQUIRED",
        );
      businessId = membership.businessId;
      membershipId = membership._id;
    }
    user.lastLoginAt = new Date();
    await user.save();
    const auth = await issueSession(
      response,
      user._id,
      businessId,
      membershipId,
    );
    response.json({
      success: true,
      message: "Signed in successfully.",
      data: { user: safeUser(user), ...auth },
    });
  }),
);

router.post(
  "/refresh",
  asyncHandler(async (request, response) => {
    const token = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token)
      throw new HttpError(
        401,
        "Refresh token is required.",
        "REFRESH_REQUIRED",
      );
    const session = await AuthSession.findOne({
      refreshTokenHash: hashToken(token),
    }).select("+refreshTokenHash");
    if (!session)
      throw new HttpError(
        401,
        "Refresh token is invalid.",
        "INVALID_REFRESH_TOKEN",
      );
    if (session.revokedAt) {
      await AuthSession.updateMany(
        { userId: session.userId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
      throw new HttpError(
        401,
        "Refresh token reuse was detected. Sign in again.",
        "REFRESH_REUSE",
      );
    }
    if (session.expiresAt <= new Date())
      throw new HttpError(401, "Refresh token expired.", "REFRESH_EXPIRED");
    const rotation = await AuthSession.updateOne(
      {
        _id: session._id,
        refreshTokenHash: hashToken(token),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { revokedAt: new Date() } },
    );
    if (rotation.modifiedCount !== 1) {
      await AuthSession.updateMany(
        { userId: session.userId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
      throw new HttpError(
        401,
        "Refresh token reuse was detected. Sign in again.",
        "REFRESH_REUSE",
      );
    }
    const auth = await issueSession(
      response,
      session.userId,
      session.businessId,
      session.membershipId,
    );
    response.json({ success: true, message: "Session refreshed.", data: auth });
  }),
);

router.post(
  "/logout",
  authenticate,
  asyncHandler(async (request, response) => {
    await AuthSession.updateOne(
      { _id: request.auth!.sessionId },
      { $set: { revokedAt: new Date() } },
    );
    const { maxAge: _maxAge, ...clearOptions } = refreshCookieOptions();
    response.clearCookie(REFRESH_COOKIE, clearOptions);
    response.json({
      success: true,
      message: "Signed out successfully.",
      data: null,
    });
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (request, response) => {
    const user = await User.findById(request.auth!.userId);
    if (!user) throw new HttpError(404, "Account not found.", "USER_NOT_FOUND");
    const business = request.auth!.businessId
      ? await Business.findById(request.auth!.businessId)
      : null;
    response.json({
      success: true,
      message: "Account retrieved successfully.",
      data: { user: safeUser(user), business, role: request.auth!.role },
    });
  }),
);

router.post(
  "/forgot-password",
  asyncHandler(async (request, response) => {
    const input = z.object({ email: z.string().email() }).parse(request.body);
    const user = await User.findOne({
      email: input.email.toLowerCase(),
      status: "active",
    });
    if (user) {
      const token = randomBytes(32).toString("base64url");
      await PasswordReset.updateMany(
        { userId: user._id, usedAt: null },
        { $set: { usedAt: new Date() } },
      );
      await PasswordReset.create({
        userId: user._id,
        tokenHash: hashToken(token),
        expiresAt: new Date(
          Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000,
        ),
      });
      const developmentLink = await sendPasswordReset(user.email, token);
      if (developmentLink)
        response.setHeader("X-Development-Reset-Link", developmentLink);
    }
    response.json({
      success: true,
      message:
        "If the account exists, password reset instructions have been sent.",
      data: null,
    });
  }),
);

router.post(
  "/reset-password",
  asyncHandler(async (request, response) => {
    const input = resetSchema.parse(request.body);
    const reset = await PasswordReset.findOne({
      tokenHash: hashToken(input.token),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!reset)
      throw new HttpError(
        400,
        "Password reset link is invalid or expired.",
        "INVALID_RESET_TOKEN",
      );
    const session = await Business.startSession();
    try {
      await session.withTransaction(async () => {
        reset.usedAt = new Date();
        await reset.save({ session });
        await User.updateOne(
          { _id: reset.userId },
          { $set: { passwordHash: await hash(input.password, 12) } },
          { session },
        );
        await AuthSession.updateMany(
          { userId: reset.userId, revokedAt: null },
          { $set: { revokedAt: new Date() } },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    response.json({
      success: true,
      message: "Password updated. Sign in with your new password.",
      data: null,
    });
  }),
);

export default router;
