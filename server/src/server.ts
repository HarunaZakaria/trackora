import { createServer } from "node:http";
import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";

async function main() {
  await connectDatabase();
  const server = createServer(createApp());
  server.listen(env.PORT, () => {
    console.info(`Stockora API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.info(`${signal} received. Shutting down Stockora API.`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error("Stockora API failed to start.", error);
  process.exitCode = 1;
});
