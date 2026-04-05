const SESSION_STORAGE_KEY = "paylink-africa-session";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readSession() {
  if (!canUseStorage()) {
    return null;
  }

  const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession);
  } catch (error) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveSession(session) {
  if (!canUseStorage()) {
    return;
  }

  const normalizedSession = {
    csrfToken: session?.csrfToken ?? ""
  };

  if (!normalizedSession.csrfToken) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(normalizedSession)
  );
}

export function clearSession() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getCsrfToken() {
  return readSession()?.csrfToken ?? "";
}
