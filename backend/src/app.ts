import cors from "cors";
import express from "express";
import { router } from "./api/routes/index.js";
import { errorHandler } from "./api/middleware/error-handler.js";
import { ipDetectionMiddleware } from "./api/middleware/ip-detection.js";
import { rateLimitMiddleware } from "./api/middleware/rate-limit.js";
import { env } from "./config/env.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(ipDetectionMiddleware);
app.use(rateLimitMiddleware);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "petrecovery-api" });
});

app.use("/api", router);
app.use(errorHandler);
