import { prisma } from "./prisma.js";
import { getClientIp, logger } from "./logger.js";

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

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return JSON.parse(JSON.stringify(metadata));
}

export function buildAuditContext(req, overrides = {}) {
  return {
    actorUserId: overrides.actorUserId ?? req.user?.id ?? req.user?.sub ?? null,
    actorEmail: overrides.actorEmail ?? req.user?.email ?? null,
    ipAddress: overrides.ipAddress ?? getClientIp(req),
    userAgent: overrides.userAgent ?? sanitizeText(req.get("user-agent")),
    requestId: overrides.requestId ?? req.requestId ?? null
  };
}

export async function writeAuditLog({
  category,
  event,
  outcome,
  actorUserId = null,
  actorEmail = null,
  ipAddress = null,
  userAgent = null,
  requestId = null,
  resourceType = null,
  resourceId = null,
  metadata = null
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        category,
        event,
        outcome,
        actorUserId: sanitizeText(actorUserId, 191),
        actorEmail: sanitizeText(actorEmail, 320),
        ipAddress: sanitizeText(ipAddress, 100),
        userAgent: sanitizeText(userAgent, 500),
        requestId: sanitizeText(requestId, 100),
        resourceType: sanitizeText(resourceType, 100),
        resourceId: sanitizeText(resourceId, 191),
        metadata: normalizeMetadata(metadata)
      }
    });
  } catch (error) {
    logger.error("Failed to persist audit log", {
      event: "audit.persist_failed",
      auditEvent: event,
      requestId,
      error
    });

    return null;
  }
}
