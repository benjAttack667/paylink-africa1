import crypto from "node:crypto";
import { createRequestLogContext, logger } from "../lib/logger.js";

function sanitizeRequestId(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 100);
}

export function attachRequestContext(req, res, next) {
  req.requestId = sanitizeRequestId(req.get("x-request-id")) ?? crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    const context = createRequestLogContext(req, {
      event: "http.request.completed",
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    });

    logger[level]("HTTP request completed", context);
  });

  next();
}
