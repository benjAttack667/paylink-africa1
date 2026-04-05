import { env } from "../config/env.js";

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function sanitizeText(value, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function sanitizeValue(value, depth = 0) {
  if (depth > 4) {
    return "[max-depth]";
  }

  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue, depth + 1)])
    );
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    return value.length > 2000 ? `${value.slice(0, 2000)}...` : value;
  }

  return value;
}

export function serializeError(error) {
  if (!(error instanceof Error)) {
    return sanitizeValue(error);
  }

  return {
    name: error.name,
    message: error.message,
    code: error.code ?? null,
    statusCode: error.statusCode ?? null,
    stack: env.nodeEnv === "production" ? undefined : error.stack
  };
}

export function getClientIp(req) {
  const forwardedFor = req.get("x-forwarded-for");

  if (forwardedFor) {
    return sanitizeText(forwardedFor.split(",")[0], 100);
  }

  return sanitizeText(req.ip ?? req.socket?.remoteAddress ?? null, 100);
}

function shouldLog(level) {
  const configuredLevel = LOG_LEVELS[env.logLevel] ?? LOG_LEVELS.info;
  return (LOG_LEVELS[level] ?? LOG_LEVELS.info) >= configuredLevel;
}

function write(level, message, context = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: env.serviceName,
    environment: env.nodeEnv,
    message,
    ...sanitizeValue(normalizeObject(context))
  };

  const line = `${JSON.stringify(payload)}\n`;
  const stream = level === "error" ? process.stderr : process.stdout;

  stream.write(line);
}

export const logger = {
  debug(message, context) {
    write("debug", message, context);
  },
  info(message, context) {
    write("info", message, context);
  },
  warn(message, context) {
    write("warn", message, context);
  },
  error(message, context) {
    write("error", message, context);
  }
};

export function createRequestLogContext(req, extraContext = {}) {
  return {
    requestId: req.requestId ?? null,
    method: req.method,
    path: req.originalUrl?.split("?")[0] ?? req.path,
    ipAddress: getClientIp(req),
    userAgent: sanitizeText(req.get("user-agent")),
    userId: req.user?.id ?? req.user?.sub ?? null,
    ...extraContext
  };
}
