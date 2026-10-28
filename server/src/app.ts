import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { HttpError } from "./lib/errors";
import { errorHandler } from "./middleware/error-handler";
import api from "./routes";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_request, response) => {
    response.json({
      success: true,
      message: "Stockora API is healthy.",
      data: { status: "ok", timestamp: new Date().toISOString() },
    });
  });

  app.use(
    "/api/v1/auth",
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use("/api/v1", api);
  app.use((_request, _response, next) =>
    next(new HttpError(404, "Endpoint not found.", "NOT_FOUND")),
  );
  app.use(errorHandler);
  return app;
}
