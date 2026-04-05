import PublicPaymentPageClient from "@/components/pay/public-payment-page-client";
import { serverApiRequest } from "@/lib/server-api";

export default async function PublicPaymentPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  let item = null;
  let initialErrorMessage = "";

  try {
    const response = await serverApiRequest(`/payment-links/${resolvedParams.slug}`);
    item = response.item;
  } catch (error) {
    initialErrorMessage = error.message;
  }

  return (
    <PublicPaymentPageClient
      slug={resolvedParams.slug}
      initialItem={item}
      initialErrorMessage={initialErrorMessage}
      paymentStatus={resolvedSearchParams.payment_status ?? ""}
      paymentReference={resolvedSearchParams.payment_reference ?? ""}
      paymentReceiptToken={resolvedSearchParams.payment_receipt_token ?? ""}
      paymentReason={resolvedSearchParams.payment_reason ?? ""}
    />
  );
}
