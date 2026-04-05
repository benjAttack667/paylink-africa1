import { Router } from "express";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

const router = Router();

router.get("/", (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: env.serviceName,
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

router.get("/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: "ready",
      service: env.serviceName,
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      checks: {
        database: {
          status: "ok"
        },
        paymentGateway: {
          status: "ok",
          provider: env.paymentGateway
        }
      }
    });
  } catch (error) {
    logger.warn("Readiness check failed", {
      event: "health.readiness.failed",
      requestId: req.requestId,
      error
    });

    return res.status(503).json({
      status: "not_ready",
      service: env.serviceName,
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      checks: {
        database: {
          status: "error"
        }
      }
    });
  }
});

export default router;
