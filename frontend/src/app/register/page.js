import RegisterPageClient from "@/components/auth/register-page-client";
import { redirectAuthenticatedUser } from "@/lib/server-auth";

export default async function RegisterPage() {
  await redirectAuthenticatedUser();
  return <RegisterPageClient />;
}
