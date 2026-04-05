import {
  getSellerProfile,
  loginSeller,
  registerSeller
} from "./auth.service.js";
import { buildAuditContext, writeAuditLog } from "../../lib/audit-log.js";
import { clearAuthCookie, setAuthCookie } from "../../lib/auth-session.js";

function setNoStoreHeaders(res) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
}

function sendAuthenticatedResponse(res, statusCode, session) {
  setNoStoreHeaders(res);
  setAuthCookie(res, session.token);

  return res.status(statusCode).json({
    user: session.user,
    csrfToken: session.csrfToken
  });
}

export async function register(req, res, next) {
  try {
    const { fullName, email, password } = req.validated.body;

    const session = await registerSeller({
      fullName,
      email,
      password
    });

    await writeAuditLog({
      ...buildAuditContext(req, {
        actorUserId: session.user.id,
        actorEmail: session.user.email
      }),
      category: "AUTH",
      event: "AUTH_REGISTER_SUCCESS",
      outcome: "SUCCESS",
      resourceType: "USER",
      resourceId: session.user.id,
      metadata: {
        email: session.user.email,
        role: session.user.role
      }
    });

    return sendAuthenticatedResponse(res, 201, session);
  } catch (error) {
    const email = req.validated?.body?.email ?? null;

    await writeAuditLog({
      ...buildAuditContext(req, {
        actorEmail: email
      }),
      category: "AUTH",
      event: "AUTH_REGISTER_FAILURE",
      outcome: "FAILURE",
      metadata: {
        email,
        errorCode: error.code ?? "REQUEST_ERROR",
        statusCode: error.statusCode ?? 500
      }
    });

    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.validated.body;

    const session = await loginSeller({
      email,
      password
    });

    await writeAuditLog({
      ...buildAuditContext(req, {
        actorUserId: session.user.id,
        actorEmail: session.user.email
      }),
      category: "AUTH",
      event: "AUTH_LOGIN_SUCCESS",
      outcome: "SUCCESS",
      resourceType: "USER",
      resourceId: session.user.id,
      metadata: {
        email: session.user.email
      }
    });

    return sendAuthenticatedResponse(res, 200, session);
  } catch (error) {
    const email = req.validated?.body?.email ?? null;

    await writeAuditLog({
      ...buildAuditContext(req, {
        actorEmail: email
      }),
      category: "AUTH",
      event: "AUTH_LOGIN_FAILURE",
      outcome: "FAILURE",
      metadata: {
        email,
        errorCode: error.code ?? "REQUEST_ERROR",
        statusCode: error.statusCode ?? 500
      }
    });

    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await getSellerProfile(req.user.sub);
    setNoStoreHeaders(res);

    return res.status(200).json({
      user,
      csrfToken: req.user.csrf
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    setNoStoreHeaders(res);
    clearAuthCookie(res);

    await writeAuditLog({
      ...buildAuditContext(req),
      category: "AUTH",
      event: "AUTH_LOGOUT",
      outcome: "SUCCESS",
      resourceType: "USER",
      resourceId: req.user.id
    });

    return res.status(200).json({
      message: "Logged out successfully"
    });
  } catch (error) {
    return next(error);
  }
}
