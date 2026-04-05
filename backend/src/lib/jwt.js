import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(user, options = {}) {
  const { csrfToken } = options;

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      csrf: csrfToken
    },
    env.jwtSecret,
    {
      algorithm: "HS256",
      expiresIn: env.jwtExpiresIn
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, {
    algorithms: ["HS256"]
  });
}

export function signReceiptToken(reference) {
  return jwt.sign(
    {
      scope: "payment-receipt",
      ref: reference
    },
    env.jwtSecret,
    {
      algorithm: "HS256",
      expiresIn: env.receiptTokenExpiresIn,
      audience: "payment-receipt",
      issuer: env.serviceName
    }
  );
}

export function verifyReceiptToken(token) {
  return jwt.verify(token, env.jwtSecret, {
    algorithms: ["HS256"],
    audience: "payment-receipt",
    issuer: env.serviceName
  });
}
