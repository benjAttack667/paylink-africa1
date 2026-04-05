import { env } from "../config/env.js";
import { buildAuditContext, writeAuditLog } from "../lib/audit-log.js";
import { createHttpError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

function getRequestToken(req) {
  return req.cookies?.[env.jwtCookieName] ?? null;
}

export async function requireAuth(req, res, next) {
  const token = getRequestToken(req);

  if (!token) {
    return next(
      createHttpError(401, "Authentication required", {
        code: "AUTH_REQUIRED"
      })
    );
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    if (!user) {
      await writeAuditLog({
        ...buildAuditContext(req, {
          actorUserId: payload.sub,
          actorEmail: payload.email ?? null
        }),
        category: "SECURITY",
        event: "AUTH_TOKEN_REJECTED",
        outcome: "FAILURE",
        resourceType: "AUTH_SESSION",
        metadata: {
          reason: "USER_NOT_FOUND"
        }
      });

      return next(
        createHttpError(401, "Invalid or expired token", {
          code: "INVALID_TOKEN"
        })
      );
    }

    req.user = {
      ...payload,
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };

    return next();
  } catch (error) {
    await writeAuditLog({
      ...buildAuditContext(req),
      category: "SECURITY",
      event: "AUTH_TOKEN_REJECTED",
      outcome: "FAILURE",
      resourceType: "AUTH_SESSION",
      metadata: {
        reason: "INVALID_OR_EXPIRED_TOKEN"
      }
    });

    return next(
      createHttpError(401, "Invalid or expired token", {
        code: "INVALID_TOKEN"
      })
    );
  }
}

export async function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const csrfToken = req.get(env.csrfHeaderName);

  if (!req.user?.csrf || !csrfToken || csrfToken !== req.user.csrf) {
    await writeAuditLog({
      ...buildAuditContext(req),
      category: "SECURITY",
      event: "CSRF_REJECTED",
      outcome: "FAILURE",
      resourceType: "HTTP_REQUEST",
      metadata: {
        method: req.method,
        path: req.originalUrl?.split("?")[0] ?? req.path
      }
    });

    return next(
      createHttpError(403, "Invalid or missing CSRF token", {
        code: "INVALID_CSRF_TOKEN"
      })
    );
  }

  return next();
}
