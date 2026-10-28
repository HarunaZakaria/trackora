import nodemailer from "nodemailer";
import { env } from "../config/env";

const transport =
  env.SMTP_HOST && env.SMTP_PORT
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
      })
    : null;

export async function sendPasswordReset(email: string, token: string) {
  const url = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  if (!transport) {
    if (env.NODE_ENV === "production")
      throw new Error("Email delivery is not configured.");
    console.info(`[development password reset] ${email}: ${url}`);
    return url;
  }
  await transport.sendMail({
    from: env.EMAIL_FROM ?? "Stockora <no-reply@localhost>",
    to: email,
    subject: "Reset your Stockora password",
    text: `Use this one-time link to reset your Stockora password. It expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes.\n\n${url}`,
  });
  return null;
}
