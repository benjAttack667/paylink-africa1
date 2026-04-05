export function createHttpError(statusCode, message, options = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (options.code) {
    error.code = options.code;
  }

  if (Array.isArray(options.errors)) {
    error.errors = options.errors;
  }

  return error;
}

export function createValidationError(errors, message = "Validation failed") {
  return createHttpError(400, message, {
    code: "VALIDATION_ERROR",
    errors
  });
}
