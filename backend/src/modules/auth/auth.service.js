import bcrypt from "bcryptjs";
import { generateCsrfToken } from "../../lib/auth-session.js";
import { createHttpError } from "../../lib/errors.js";
import { signAccessToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    businessName: user.businessName,
    countryCode: user.countryCode,
    createdAt: user.createdAt
  };
}

function buildAuthenticatedSession(user) {
  const csrfToken = generateCsrfToken();

  return {
    token: signAccessToken(user, { csrfToken }),
    csrfToken,
    user: sanitizeUser(user)
  };
}

export async function registerSeller({ fullName, email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (existingUser) {
    throw createHttpError(409, "Unable to create account with the provided information");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      fullName,
      email: normalizedEmail,
      passwordHash
    }
  });

  return buildAuthenticatedSession(user);
}

export async function loginSeller({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (!user) {
    throw createHttpError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw createHttpError(401, "Invalid email or password");
  }

  return buildAuthenticatedSession(user);
}

export async function getSellerProfile(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return sanitizeUser(user);
}
