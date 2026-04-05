import DashboardPageClient from "@/components/dashboard/dashboard-page-client";
import { serverApiRequest } from "@/lib/server-api";
import { requireServerSession } from "@/lib/server-auth";

export default async function DashboardPage() {
  const session = await requireServerSession();
  const dashboardData = await serverApiRequest("/payment-links");

  return (
    <DashboardPageClient
      initialUser={session.user}
      initialCsrfToken={session.csrfToken}
      initialDashboardData={dashboardData}
    />
  );
}
