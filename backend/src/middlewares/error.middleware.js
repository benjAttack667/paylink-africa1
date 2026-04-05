import { createRequestLogContext, logger } from "../lib/logger.js";

export function notFoundHandler(req, res) {
  return res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: "ROUTE_NOT_FOUND",
    requestId: req.requestId
  });
}

export function errorHandler(error, req, res, next) {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      message: "Invalid JSON payload",
      code: "INVALID_JSON",
      requestId: req.requestId
    });
  }

  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    logger.error("Unhandled request error", createRequestLogContext(req, {
      event: "http.request.error",
      statusCode,
      error
    }));
  }

  const responseBody = {
    message:
      statusCode >= 500
        ? "Internal server error"
        : error.message ?? "Request failed",
    code:
      statusCode >= 500
        ? "INTERNAL_SERVER_ERROR"
        : error.code ?? "REQUEST_ERROR",
    requestId: req.requestId
  };

  if (statusCode < 500 && Array.isArray(error.errors) && error.errors.length > 0) {
    responseBody.errors = error.errors;
  }

  return res.status(statusCode).json(responseBody);
}
