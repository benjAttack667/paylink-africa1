import MockCheckoutPageClient from "@/components/pay/mock-checkout-page-client";
import { serverApiRequest } from "@/lib/server-api";

export default async function MockCheckoutPage({ params }) {
  const resolvedParams = await params;
  let session = null;
  let initialErrorMessage = "";

  try {
    const response = await serverApiRequest(
      `/payments/mock/${resolvedParams.reference}`
    );
    session = response.session;
  } catch (error) {
    initialErrorMessage = error.message;
  }

  return (
    <MockCheckoutPageClient
      reference={resolvedParams.reference}
      initialSession={session}
      initialErrorMessage={initialErrorMessage}
    />
  );
}
