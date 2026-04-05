import { createValidationError } from "./errors.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildFieldError(field, message) {
  return {
    field,
    message
  };
}

export function stringField(options = {}) {
  const {
    required = true,
    min,
    max,
    trim = true,
    nullable = false,
    emptyAsNull = false,
    pattern,
    messages = {}
  } = options;

  return {
    required,
    parse(value, field) {
      if (value === null) {
        if (nullable) {
          return {
            value: null
          };
        }

        return {
          error: messages.type ?? `${field} must be a string`
        };
      }

      if (typeof value !== "string") {
        return {
          error: messages.type ?? `${field} must be a string`
        };
      }

      const normalizedValue = trim ? value.trim() : value;

      if (normalizedValue.length === 0) {
        if (nullable && emptyAsNull) {
          return {
            value: null
          };
        }

        return {
          error: messages.required ?? `${field} is required`
        };
      }

      if (min !== undefined && normalizedValue.length < min) {
        return {
          error: messages.min ?? `${field} must contain at least ${min} characters`
        };
      }

      if (max !== undefined && normalizedValue.length > max) {
        return {
          error: messages.max ?? `${field} must contain at most ${max} characters`
        };
      }

      if (pattern && !pattern.test(normalizedValue)) {
        return {
          error: messages.pattern ?? `${field} format is invalid`
        };
      }

      return {
        value: normalizedValue
      };
    }
  };
}

export function emailField(options = {}) {
  return stringField({
    ...options,
    pattern: emailPattern,
    messages: {
      pattern: "Please provide a valid email address",
      ...(options.messages ?? {})
    }
  });
}

export function decimalField(options = {}) {
  const {
    required = true,
    max = 100000000,
    messages = {}
  } = options;

  return {
    required,
    parse(value, field) {
      const parsedValue = Number(value);

      if (!Number.isFinite(parsedValue) || parsedValue <= 0 || parsedValue > max) {
        return {
          error: messages.invalid ?? `${field} must be a positive number`
        };
      }

      return {
        value: parsedValue.toFixed(2)
      };
    }
  };
}

export function booleanField(options = {}) {
  const {
    required = true,
    messages = {}
  } = options;

  return {
    required,
    parse(value, field) {
      if (typeof value !== "boolean") {
        return {
          error: messages.type ?? `${field} must be a boolean`
        };
      }

      return {
        value
      };
    }
  };
}

export function idField(options = {}) {
  return stringField({
    ...options,
    min: 1,
    max: 64
  });
}

export function slugField(options = {}) {
  return stringField({
    ...options,
    min: 1,
    max: 64,
    pattern: slugPattern,
    messages: {
      pattern: "slug format is invalid",
      ...(options.messages ?? {})
    }
  });
}

export function validateObject(input, schema, options = {}) {
  const {
    allowUnknown = false,
    partial = false,
    sourceName = "body",
    minKnownFields = partial ? 1 : 0
  } = options;

  if (!isPlainObject(input)) {
    throw createValidationError([
      buildFieldError(sourceName, `${sourceName} must be a JSON object`)
    ]);
  }

  const errors = [];
  const output = {};
  const schemaKeys = Object.keys(schema);
  let providedKnownFields = 0;

  if (!allowUnknown) {
    for (const key of Object.keys(input)) {
      if (!schemaKeys.includes(key)) {
        errors.push(buildFieldError(key, `${key} is not allowed`));
      }
    }
  }

  for (const key of schemaKeys) {
    const fieldConfig = schema[key];
    const hasKey = Object.prototype.hasOwnProperty.call(input, key);

    if (!hasKey) {
      if (!partial && fieldConfig.required !== false) {
        errors.push(buildFieldError(key, `${key} is required`));
      }

      continue;
    }

    providedKnownFields += 1;
    const result = fieldConfig.parse(input[key], key);

    if (result.error) {
      errors.push(buildFieldError(key, result.error));
      continue;
    }

    output[key] = result.value;
  }

  if (providedKnownFields < minKnownFields) {
    errors.push(buildFieldError(sourceName, "At least one field must be provided"));
  }

  if (errors.length > 0) {
    throw createValidationError(errors);
  }

  return output;
}

export function validateRequest(config) {
  return (req, res, next) => {
    try {
      req.validated = req.validated ?? {};

      if (config.bodySchema) {
        req.validated.body = validateObject(req.body, config.bodySchema, {
          sourceName: "body",
          ...(config.bodyOptions ?? {})
        });
      }

      if (config.paramsSchema) {
        req.validated.params = validateObject(req.params, config.paramsSchema, {
          sourceName: "params",
          ...(config.paramsOptions ?? {})
        });
      }

      if (config.querySchema) {
        req.validated.query = validateObject(req.query, config.querySchema, {
          sourceName: "query",
          ...(config.queryOptions ?? {})
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
