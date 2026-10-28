import { createHmac, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env";
import { AuthSession } from "../models";

export const REFRESH_COOKIE = "stockora_refresh";

export function hashToken(token: string) {
  return createHmac("sha256", env.JWT_REFRESH_SECRET)
    .update(token)
    .digest("hex");
}

export async function createSession(
  userId: Types.ObjectId,
  businessId: Types.ObjectId | null,
  membershipId: Types.ObjectId | null,
) {
  const refreshToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86_400_000);
  const session = await AuthSession.create({
    userId,
    businessId,
    membershipId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
  });
  const accessToken = jwt.sign(
    { sid: session._id.toString() },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId.toString(),
      expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
    },
  );
  return { accessToken, refreshToken, session };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_DAYS * 86_400_000,
  };
}
