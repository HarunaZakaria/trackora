import type { SrvRecord } from "node:dns";
import { resolveSrv } from "node:dns/promises";
import mongoose from "mongoose";
import { setTimeout as delay } from "node:timers/promises";
import { env } from "./env";

const MAX_CONNECTION_ATTEMPTS = 5;
type SrvResolver = (hostname: string) => Promise<SrvRecord[]>;

export async function connectDatabase(
  uri = env.MONGODB_URI,
  srvResolver: SrvResolver = resolveSrv,
) {
  let connectionUri = uri;
  let usedSrvFallback = false;

  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(connectionUri, {
        autoIndex: env.NODE_ENV !== "production",
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
      });
      return;
    } catch (error) {
      if (
        !usedSrvFallback &&
        connectionUri.startsWith("mongodb+srv://") &&
        isTxtRecordTimeout(error)
      ) {
        connectionUri = await createSeedListUri(connectionUri, srvResolver);
        usedSrvFallback = true;
        console.warn(
          "MongoDB TXT lookup timed out; retrying with Atlas SRV seed hosts and TLS.",
        );
        continue;
      }
      if (
        attempt === MAX_CONNECTION_ATTEMPTS ||
        !isTransientConnectionError(error)
      ) {
        throw error;
      }
      const waitMs = Math.min(1_000 * 2 ** (attempt - 1), 8_000);
      console.warn(
        `MongoDB connection attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS} failed due to a transient network/DNS error; retrying in ${waitMs / 1_000}s.`,
      );
      await delay(waitMs);
    }
  }
}

export async function createSeedListUri(
  srvUri: string,
  srvResolver: SrvResolver = resolveSrv,
) {
  const parsed = new URL(srvUri);
  if (parsed.protocol !== "mongodb+srv:") {
    throw new Error(
      "An mongodb+srv URI is required to resolve Atlas seed hosts.",
    );
  }
  const records = await srvResolver(`_mongodb._tcp.${parsed.hostname}`);
  if (records.length === 0) {
    throw new Error("MongoDB SRV lookup returned no seed hosts.");
  }

  const credentials = parsed.username
    ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`
    : "";
  const hosts = records
    .map((record) => `${record.name}:${record.port}`)
    .join(",");
  const options = new URLSearchParams(parsed.searchParams);
  options.set("tls", "true");
  if (!parsed.pathname || parsed.pathname === "/") {
    options.set("authSource", "admin");
  }
  const query = options.toString();
  return `mongodb://${credentials}${hosts}${parsed.pathname}${query ? `?${query}` : ""}`;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

function isTransientConnectionError(error: unknown): boolean {
  const transientCodes = new Set([
    "ETIMEOUT",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ECONNRESET",
    "EAI_AGAIN",
    "ENOTFOUND",
  ]);
  const pending: unknown[] = [error];
  const visited = new Set<unknown>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    if (typeof current !== "object") continue;

    const details = current as {
      code?: unknown;
      name?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (typeof details.code === "string" && transientCodes.has(details.code)) {
      return true;
    }
    if (
      details.name === "MongoServerSelectionError" ||
      details.name === "MongoNetworkError"
    ) {
      return true;
    }
    if (
      typeof details.message === "string" &&
      /(?:queryTxt|querySrv).*ETIMEOUT|DNS.*(?:timeout|timed out)|server selection timed out/i.test(
        details.message,
      )
    ) {
      return true;
    }
    pending.push(details.cause);
  }

  return false;
}

function isTxtRecordTimeout(error: unknown): boolean {
  const pending: unknown[] = [error];
  const visited = new Set<unknown>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    if (typeof current !== "object") continue;
    const details = current as {
      code?: unknown;
      syscall?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (
      (details.syscall === "queryTxt" ||
        (typeof details.message === "string" &&
          /queryTxt/i.test(details.message))) &&
      (details.code === "ETIMEOUT" ||
        (typeof details.message === "string" &&
          /ETIMEOUT/i.test(details.message)))
    ) {
      return true;
    }
    pending.push(details.cause);
  }
  return false;
}
