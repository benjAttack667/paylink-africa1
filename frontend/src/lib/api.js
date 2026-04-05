const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:4000/api" : "");

const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

export function buildApiUrl(path) {
  if (!API_BASE_URL) {
    return "";
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    csrfToken,
    headers,
    cache = "no-store",
    credentials = "include"
  } = options;
  const requestHeaders = new Headers(headers ?? {});

  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (csrfToken) {
    requestHeaders.set("X-CSRF-Token", csrfToken);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache,
      credentials
    });
  } catch (error) {
    throw new Error("Unable to reach the server");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const validationMessage =
      payload &&
      typeof payload === "object" &&
      Array.isArray(payload.errors) &&
      payload.errors.length > 0
        ? payload.errors[0].message
        : null;

    const error = new Error(
      payload && typeof payload === "object" && payload.message
        ? validationMessage ?? payload.message
        : "Request failed"
    );

    error.statusCode = response.status;
    error.code = payload?.code;
    error.errors = payload?.errors ?? [];
    throw error;
  }

  return payload;
}

export function isUnauthorizedError(error) {
  return error?.statusCode === 401;
}

export function isForbiddenError(error) {
  return error?.statusCode === 403;
}

export function isNotFoundError(error) {
  return error?.statusCode === 404;
}
