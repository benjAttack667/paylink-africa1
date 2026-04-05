import dotenv from "dotenv";

dotenv.config();

function parseBoolean(value, fallbackValue) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallbackValue;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  return fallbackValue;
}

function parseDurationToMilliseconds(value, fallbackValue) {
  const normalizedValue = typeof value === "string" && value.trim().length > 0 ? value.trim() : fallbackValue;
  const match = normalizedValue.match(/^(\d+)(ms|s|m|h|d)$/i);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMap = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * unitMap[unit];
}

function normalizeSameSite(value, fallbackValue) {
  const normalizedValue =
    typeof value === "string" && value.trim().length > 0
      ? value.trim().toLowerCase()
      : fallbackValue;

  if (["lax", "strict", "none"].includes(normalizedValue)) {
    return normalizedValue;
  }

  return fallbackValue;
}

function normalizePaymentGateway(value, fallbackValue) {
  const normalizedValue =
    typeof value === "string" && value.trim().length > 0
      ? value.trim().toUpperCase()
      : fallbackValue;

  if (["MOCK", "FLUTTERWAVE"].includes(normalizedValue)) {
    return normalizedValue;
  }

  return fallbackValue;
}

function normalizeLogLevel(value, fallbackValue) {
  const normalizedValue =
    typeof value === "string" && value.trim().length > 0
      ? value.trim().toLowerCase()
      : fallbackValue;

  if (["debug", "info", "warn", "error"].includes(normalizedValue)) {
    return normalizedValue;
  }

  return fallbackValue;
}

function parseAllowedOrigins(value, fallbackValue) {
  const rawValue = value && value.trim().length > 0 ? value : fallbackValue;

  return rawValue
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  serviceName: (process.env.SERVICE_NAME ?? "payment-links-api").trim(),
  port: Number(process.env.PORT ?? 4000),
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 1),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  receiptTokenExpiresIn: process.env.RECEIPT_TOKEN_EXPIRES_IN ?? "30d",
  jwtCookieName: process.env.JWT_COOKIE_NAME ?? "paylink_access",
  jwtCookieMaxAgeMs: parseDurationToMilliseconds(
    process.env.JWT_COOKIE_MAX_AGE ?? "",
    process.env.JWT_EXPIRES_IN ?? "12h"
  ),
  cookieSecure: parseBoolean(
    process.env.COOKIE_SECURE ?? "",
    (process.env.NODE_ENV ?? "development") === "production"
  ),
  cookieSameSite: normalizeSameSite(process.env.COOKIE_SAME_SITE ?? "", "lax"),
  cookieDomain: process.env.COOKIE_DOMAIN?.trim() ?? "",
  csrfHeaderName: (process.env.CSRF_HEADER_NAME ?? "x-csrf-token").trim().toLowerCase(),
  authRateLimitWindowMs:
    Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES ?? 15) * 60 * 1000,
  authLoginRateLimitMax: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? 8),
  authRegisterRateLimitMax: Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX ?? 4),
  paymentRateLimitWindowMs:
    Number(process.env.PAYMENT_RATE_LIMIT_WINDOW_MINUTES ?? 15) * 60 * 1000,
  paymentRateLimitMax: Number(process.env.PAYMENT_RATE_LIMIT_MAX ?? 20),
  paymentGateway: normalizePaymentGateway(process.env.PAYMENT_GATEWAY ?? "", "MOCK"),
  allowMockPaymentsInProduction: parseBoolean(
    process.env.ALLOW_MOCK_PAYMENTS_IN_PRODUCTION ?? "",
    false
  ),
  paymentCurrency: (process.env.PAYMENT_CURRENCY ?? "NGN").trim().toUpperCase(),
  apiPublicUrl: (process.env.API_PUBLIC_URL ?? "http://localhost:4000").trim(),
  flutterwaveApiBaseUrl: (
    process.env.FLUTTERWAVE_API_BASE_URL ?? "https://api.flutterwave.com"
  ).trim().replace(/\/+$/, ""),
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY ?? "",
  flutterwaveWebhookHash: process.env.FLUTTERWAVE_WEBHOOK_HASH ?? "",
  flutterwaveCheckoutSessionDurationMinutes: Number(
    process.env.FLUTTERWAVE_CHECKOUT_SESSION_DURATION_MINUTES ?? 30
  ),
  flutterwaveMaxRetryAttempts: Number(
    process.env.FLUTTERWAVE_MAX_RETRY_ATTEMPTS ?? 5
  ),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:3000",
  allowedOrigins: parseAllowedOrigins(
    process.env.ALLOWED_ORIGINS ?? "",
    process.env.CLIENT_URL ?? "http://localhost:3000"
  ),
  logFormat:
    process.env.LOG_FORMAT ??
    (process.env.NODE_ENV === "production" ? "combined" : "dev"),
  logLevel: normalizeLogLevel(process.env.LOG_LEVEL ?? "", "info")
};

export function validateEnv() {
  const missing = [];

  if (!env.databaseUrl) {
    missing.push("DATABASE_URL");
  }

  if (!env.jwtSecret) {
    missing.push("JWT_SECRET");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (!Number.isFinite(env.port) || env.port <= 0) {
    throw new Error("PORT must be a positive number");
  }

  if (!env.serviceName) {
    throw new Error("SERVICE_NAME must not be empty");
  }

  if (!Number.isFinite(env.trustProxyHops) || env.trustProxyHops < 0) {
    throw new Error("TRUST_PROXY_HOPS must be zero or a positive number");
  }

  if (env.nodeEnv === "production" && env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }

  if (!parseDurationToMilliseconds(env.receiptTokenExpiresIn, env.receiptTokenExpiresIn)) {
    throw new Error("RECEIPT_TOKEN_EXPIRES_IN must use a duration like 12h, 7d or 30d");
  }

  if (env.nodeEnv === "production" && !env.cookieSecure) {
    throw new Error("COOKIE_SECURE must be true in production");
  }

  if (!env.jwtCookieName) {
    throw new Error("JWT_COOKIE_NAME must not be empty");
  }

  if (!env.jwtCookieMaxAgeMs || env.jwtCookieMaxAgeMs <= 0) {
    throw new Error(
      "JWT_COOKIE_MAX_AGE or JWT_EXPIRES_IN must use a duration like 15m, 12h or 7d"
    );
  }

  if (env.cookieSameSite === "none" && !env.cookieSecure) {
    throw new Error("COOKIE_SAME_SITE=none requires COOKIE_SECURE=true");
  }

  if (!Number.isFinite(env.authRateLimitWindowMs) || env.authRateLimitWindowMs <= 0) {
    throw new Error("AUTH_RATE_LIMIT_WINDOW_MINUTES must be a positive number");
  }

  if (!Number.isFinite(env.authLoginRateLimitMax) || env.authLoginRateLimitMax <= 0) {
    throw new Error("AUTH_LOGIN_RATE_LIMIT_MAX must be a positive number");
  }

  if (!Number.isFinite(env.authRegisterRateLimitMax) || env.authRegisterRateLimitMax <= 0) {
    throw new Error("AUTH_REGISTER_RATE_LIMIT_MAX must be a positive number");
  }

  if (!Number.isFinite(env.paymentRateLimitWindowMs) || env.paymentRateLimitWindowMs <= 0) {
    throw new Error("PAYMENT_RATE_LIMIT_WINDOW_MINUTES must be a positive number");
  }

  if (!Number.isFinite(env.paymentRateLimitMax) || env.paymentRateLimitMax <= 0) {
    throw new Error("PAYMENT_RATE_LIMIT_MAX must be a positive number");
  }

  if (!/^[A-Z]{3}$/.test(env.paymentCurrency)) {
    throw new Error("PAYMENT_CURRENCY must be a 3-letter uppercase currency code");
  }

  if (!env.apiPublicUrl) {
    throw new Error("API_PUBLIC_URL must not be empty");
  }

  if (
    env.nodeEnv === "production" &&
    env.paymentGateway === "MOCK" &&
    !env.allowMockPaymentsInProduction
  ) {
    throw new Error(
      "PAYMENT_GATEWAY=MOCK is not allowed in production unless ALLOW_MOCK_PAYMENTS_IN_PRODUCTION=true"
    );
  }

  if (
    !Number.isFinite(env.flutterwaveCheckoutSessionDurationMinutes) ||
    env.flutterwaveCheckoutSessionDurationMinutes <= 0
  ) {
    throw new Error("FLUTTERWAVE_CHECKOUT_SESSION_DURATION_MINUTES must be positive");
  }

  if (!Number.isFinite(env.flutterwaveMaxRetryAttempts) || env.flutterwaveMaxRetryAttempts <= 0) {
    throw new Error("FLUTTERWAVE_MAX_RETRY_ATTEMPTS must be a positive number");
  }

  if (env.paymentGateway === "FLUTTERWAVE") {
    if (!env.flutterwaveSecretKey) {
      throw new Error("FLUTTERWAVE_SECRET_KEY is required when PAYMENT_GATEWAY=FLUTTERWAVE");
    }

    if (!env.flutterwaveWebhookHash) {
      throw new Error("FLUTTERWAVE_WEBHOOK_HASH is required when PAYMENT_GATEWAY=FLUTTERWAVE");
    }
  }

  if (!env.csrfHeaderName) {
    throw new Error("CSRF_HEADER_NAME must not be empty");
  }
}
