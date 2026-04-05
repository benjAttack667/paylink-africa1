import { createHttpError } from "../../../lib/errors.js";
import { env } from "../../../config/env.js";
import { isValidFlutterwaveWebhookSignature } from "../webhook-signature.js";

export function createMockGateway() {
  return {
    provider: "MOCK",
    async createCheckout({ payment }) {
      return {
        checkoutUrl: `${env.clientUrl}/checkout/mock/${encodeURIComponent(payment.reference)}`,
        providerPayload: {
          provider: "MOCK",
          checkout_url: "mock"
        }
      };
    },
    async verifyTransaction({ transactionId, payment }) {
      const expectedTransactionId = `mock-${payment.id}`;

      if (transactionId !== expectedTransactionId) {
        throw createHttpError(409, "Mock transaction verification failed", {
          code: "PAYMENT_VERIFICATION_FAILED"
        });
      }

      return {
        providerTransactionId: transactionId,
        reference: payment.reference,
        status: "successful",
        amount: payment.amount,
        currency: payment.currency,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
        paidAt: new Date(),
        rawData: {
          provider: "MOCK",
          id: transactionId,
          tx_ref: payment.reference,
          status: "successful"
        }
      };
    },
    isValidWebhookSignature(req) {
      return isValidFlutterwaveWebhookSignature(req, env.flutterwaveWebhookHash);
    }
  };
}
