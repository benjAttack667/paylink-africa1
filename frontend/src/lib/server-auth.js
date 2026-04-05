import { redirect } from "next/navigation";
import { serverApiRequest } from "./server-api";

export async function getServerSession() {
  try {
    return await serverApiRequest("/auth/me");
  } catch (error) {
    if (error?.statusCode === 401) {
      return null;
    }

    throw error;
  }
}

export async function requireServerSession() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function redirectAuthenticatedUser() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }
}
