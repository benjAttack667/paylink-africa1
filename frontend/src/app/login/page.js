import LoginPageClient from "@/components/auth/login-page-client";
import { redirectAuthenticatedUser } from "@/lib/server-auth";

export default async function LoginPage() {
  await redirectAuthenticatedUser();
  return <LoginPageClient />;
}
