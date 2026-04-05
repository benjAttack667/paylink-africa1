import { env } from "../../../config/env.js";
import { createHttpError } from "../../../lib/errors.js";
import { isValidFlutterwaveWebhookSignature } from "../webhook-signature.js";

async function flutterwaveRequest(path, options = {}) {
  const response = await fetch(`${env.flutterwaveApiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${env.flutterwaveSecretKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw createHttpError(502, "Unable to process payment with Flutterwave", {
      code: "PAYMENT_PROVIDER_ERROR",
      errors: [
        {
          field: "provider",
          message:
            payload && typeof payload === "object" && payload.message
              ? payload.message
              : "Flutterwave request failed"
        }
      ]
    });
  }

  return payload;
}

export function createFlutterwaveGateway() {
  return {
    provider: "FLUTTERWAVE",
    async createCheckout({ payment, product }) {
      const payload = await flutterwaveRequest("/v3/payments", {
        method: "POST",
        body: {
          tx_ref: payment.reference,
          amount: payment.amount,
          currency: payment.currency,
          redirect_url: `${env.apiPublicUrl}/api/payments/flutterwave/callback`,
          customer: {
            email: payment.customerEmail,
            name: payment.customerName,
            phonenumber: payment.customerPhone || undefined
          },
          customizations: {
            title: product.name,
            description: product.description || product.name
          },
          meta: {
            payment_id: payment.id,
            product_id: product.id,
            product_slug: product.slug
          },
          configurations: {
            session_duration: env.flutterwaveCheckoutSessionDurationMinutes,
            max_retry_attempt: env.flutterwaveMaxRetryAttempts
          }
        }
      });

      const checkoutUrl = payload?.data?.link;

      if (!checkoutUrl) {
        throw createHttpError(502, "Flutterwave did not return a checkout URL", {
          code: "PAYMENT_PROVIDER_ERROR"
        });
      }

      return {
        checkoutUrl,
        providerPayload: payload
      };
    },
    async verifyTransaction({ transactionId }) {
      const payload = await flutterwaveRequest(
        `/v3/transactions/${encodeURIComponent(transactionId)}/verify`
      );
      const data = payload?.data;

      if (!data?.tx_ref) {
        throw createHttpError(502, "Flutterwave verification response is incomplete", {
          code: "PAYMENT_PROVIDER_ERROR"
        });
      }

      return {
        providerTransactionId: String(data.id),
        reference: data.tx_ref,
        status: data.status,
        amount: Number(data.amount).toFixed(2),
        currency: String(data.currency ?? "").toUpperCase(),
        customerEmail: data.customer?.email ?? null,
        customerName: data.customer?.name ?? null,
        paidAt: data.created_at ? new Date(data.created_at) : new Date(),
        rawData: data
      };
    },
    isValidWebhookSignature(req) {
      return isValidFlutterwaveWebhookSignature(req, env.flutterwaveWebhookHash);
    }
  };
}
