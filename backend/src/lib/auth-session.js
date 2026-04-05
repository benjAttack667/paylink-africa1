import crypto from "node:crypto";
import { env } from "../config/env.js";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: "/",
    maxAge: env.jwtCookieMaxAgeMs,
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {})
  };
}

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function setAuthCookie(res, token) {
  res.cookie(env.jwtCookieName, token, getCookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(env.jwtCookieName, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: "/",
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {})
  });
}
