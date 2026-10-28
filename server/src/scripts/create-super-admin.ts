import { hash } from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { env } from "../config/env";
import { User } from "../models";

async function main() {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
    throw new Error(
      "Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in server/.env first.",
    );
  }
  await connectDatabase();
  const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.platformRole !== "super-admin") {
      existing.platformRole = "super-admin";
      await existing.save();
    }
    console.info(`Super administrator is ready: ${email}`);
    return;
  }
  await User.create({
    name: "Platform administrator",
    email,
    passwordHash: await hash(env.SUPER_ADMIN_PASSWORD, 12),
    platformRole: "super-admin",
  });
  console.info(`Super administrator created: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
