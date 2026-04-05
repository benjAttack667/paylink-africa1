import { cookies } from "next/headers";

const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:4000/api" : "");

export const SERVER_API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

function buildCookieHeader(cookieStore) {
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function serverApiRequest(path, options = {}) {
  const { method = "GET", body, headers } = options;
  const requestHeaders = new Headers(headers ?? {});

  if (!SERVER_API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);

  if (cookieHeader && !requestHeaders.has("Cookie")) {
    requestHeaders.set("Cookie", cookieHeader);
  }

  const response = await fetch(`${SERVER_API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      payload && typeof payload === "object" && payload.message
        ? payload.message
        : "Request failed"
    );

    error.statusCode = response.status;
    error.code = payload?.code;
    error.errors = payload?.errors ?? [];
    throw error;
  }

  return payload;
}
