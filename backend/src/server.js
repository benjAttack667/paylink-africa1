import app from "./app.js";
import { env, validateEnv } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

validateEnv();

const server = app.listen(env.port, () => {
  logger.info("API server started", {
    event: "server.started",
    port: env.port,
    environment: env.nodeEnv,
    service: env.serviceName
  });
});

let shuttingDown = false;

async function shutdown(signal, error = null) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  logger.warn("API server shutting down", {
    event: "server.shutdown.started",
    signal,
    error
  });

  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    logger.error("Failed to disconnect Prisma client during shutdown", {
      event: "server.shutdown.prisma_disconnect_failed",
      signal,
      error: disconnectError
    });
  }

  server.close(() => {
    logger.info("API server stopped", {
      event: "server.shutdown.completed",
      signal
    });

    process.exit(error ? 1 : 0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", {
    event: "server.unhandled_rejection",
    error
  });
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    event: "server.uncaught_exception",
    error
  });

  shutdown("UNCAUGHT_EXCEPTION", error);
});
