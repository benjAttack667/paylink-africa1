import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";

function buildAuthLimiter(limit) {
  return rateLimit({
    windowMs: env.authRateLimitWindowMs,
    limit,
    keyGenerator(req) {
      const email =
        typeof req.body?.email === "string" && req.body.email.trim().length > 0
          ? req.body.email.trim().toLowerCase()
          : "anonymous";

      return `${ipKeyGenerator(req.ip)}:${req.path}:${email}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many authentication attempts. Please try again later."
    }
  });
}

export const loginRateLimiter = buildAuthLimiter(env.authLoginRateLimitMax);
export const registerRateLimiter = buildAuthLimiter(env.authRegisterRateLimitMax);

export const paymentCheckoutRateLimiter = rateLimit({
  windowMs: env.paymentRateLimitWindowMs,
  limit: env.paymentRateLimitMax,
  keyGenerator(req) {
    return `${ipKeyGenerator(req.ip)}:${req.params.slug ?? "payment"}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many payment attempts. Please try again later."
  }
});
