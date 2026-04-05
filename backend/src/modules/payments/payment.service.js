import crypto from "node:crypto";
import { createHttpError } from "../../lib/errors.js";
import { signReceiptToken, verifyReceiptToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { writeAuditLog } from "../../lib/audit-log.js";
import { getPaymentGateway } from "./payment-gateway.js";
import { generatePaymentReceiptPdf } from "./payment-receipt.js";

function formatDecimalValue(value) {
  return Number(value.toString()).toFixed(2);
}

function createPaymentReference() {
  return `PAY-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

function serializePayment(payment) {
  return {
    id: payment.id,
    reference: payment.reference,
    amount: formatDecimalValue(payment.amount),
    currency: payment.currency,
    status: payment.status,
    customerEmail: payment.customerEmail,
    customerName: payment.customerName,
    customerPhone: payment.customerPhone,
    checkoutUrl: payment.checkoutUrl,
    failureReason: payment.failureReason,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt
  };
}

function buildReceiptDownloadUrl(reference, token) {
  return `${env.apiPublicUrl}/api/payments/${encodeURIComponent(reference)}/receipt?token=${encodeURIComponent(token)}`;
}

function createReceiptAccess(reference) {
  const token = signReceiptToken(reference);

  return {
    token,
    downloadUrl: buildReceiptDownloadUrl(reference, token)
  };
}

async function findActiveProductBySlug(slug) {
  const product = await prisma.product.findUnique({
    where: {
      slug
    },
    include: {
      seller: {
        select: {
          fullName: true
        }
      }
    }
  });

  if (!product || !product.isActive) {
    throw createHttpError(404, "Product not found");
  }

  return product;
}

async function findPaymentByReference(reference) {
  return prisma.payment.findUnique({
    where: {
      reference
    },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          seller: {
            select: {
              fullName: true
            }
          }
        }
      }
    }
  });
}

function ensureMockCheckoutEnabled() {
  if (env.paymentGateway !== "MOCK") {
    throw createHttpError(404, "Checkout not found");
  }
}

function serializeMockCheckoutSession(payment) {
  const receiptAccess =
    payment.status === "PAID" ? createReceiptAccess(payment.reference) : null;

  return {
    reference: payment.reference,
    status: payment.status,
    amount: formatDecimalValue(payment.amount),
    currency: payment.currency,
    createdAt: payment.createdAt,
    failureReason: payment.failureReason ?? null,
    returnUrl: `${env.clientUrl}/pay/${payment.product.slug}`,
    receiptToken: receiptAccess?.token ?? null,
    receiptDownloadUrl: receiptAccess?.downloadUrl ?? null,
    product: {
      slug: payment.product.slug,
      name: payment.product.name,
      description: payment.product.description,
      sellerName: payment.product.seller?.fullName ?? null
    }
  };
}

function ensureVerificationMatches(payment, verification) {
  if (verification.reference !== payment.reference) {
    throw createHttpError(409, "Payment verification reference mismatch", {
      code: "PAYMENT_VERIFICATION_FAILED"
    });
  }

  if (verification.amount !== formatDecimalValue(payment.amount)) {
    throw createHttpError(409, "Payment verification amount mismatch", {
      code: "PAYMENT_VERIFICATION_FAILED"
    });
  }

  if (verification.currency !== payment.currency) {
    throw createHttpError(409, "Payment verification currency mismatch", {
      code: "PAYMENT_VERIFICATION_FAILED"
    });
  }
}

async function persistSuccessfulPayment(payment, verification, auditContext = {}) {
  if (payment.status === "PAID") {
    return payment;
  }

  const updatedPayment = await prisma.payment.update({
    where: {
      id: payment.id
    },
    data: {
      status: "PAID",
      paidAt: verification.paidAt ?? new Date(),
      verifiedAt: new Date(),
      failureReason: null,
      providerTransactionId: verification.providerTransactionId,
      providerPayload: verification.rawData
    },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true
        }
      }
    }
  });

  await writeAuditLog({
    ...auditContext,
    category: "PAYMENT",
    event: "PAYMENT_CONFIRMED",
    outcome: "SUCCESS",
    resourceType: "PAYMENT",
    resourceId: updatedPayment.id,
    metadata: {
      reference: updatedPayment.reference,
      productId: updatedPayment.productId,
      sellerId: updatedPayment.sellerId,
      provider: updatedPayment.provider,
      providerTransactionId: verification.providerTransactionId,
      amount: formatDecimalValue(updatedPayment.amount),
      currency: updatedPayment.currency
    }
  });

  return updatedPayment;
}

async function persistFailedPayment(payment, reason, providerPayload = null, auditContext = {}) {
  if (payment.status === "PAID") {
    return payment;
  }

  const failedPayment = await prisma.payment.update({
    where: {
      id: payment.id
    },
    data: {
      status: "FAILED",
      verifiedAt: new Date(),
      failureReason: reason,
      providerPayload: providerPayload ?? undefined
    },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true
        }
      }
    }
  });

  await writeAuditLog({
    ...auditContext,
    category: "PAYMENT",
    event: "PAYMENT_FAILED",
    outcome: "FAILURE",
    resourceType: "PAYMENT",
    resourceId: failedPayment.id,
    metadata: {
      reference: failedPayment.reference,
      productId: failedPayment.productId,
      sellerId: failedPayment.sellerId,
      provider: failedPayment.provider,
      amount: formatDecimalValue(failedPayment.amount),
      currency: failedPayment.currency,
      reason
    }
  });

  return failedPayment;
}

function buildFrontendRedirect(productSlug, paymentStatus, reference, reason) {
  const query = new URLSearchParams({
    payment_status: paymentStatus,
    payment_reference: reference
  });

  if (paymentStatus === "paid") {
    query.set("payment_receipt_token", signReceiptToken(reference));
  }

  if (reason) {
    query.set("payment_reason", reason);
  }

  return `${env.clientUrl}/pay/${productSlug}?${query.toString()}`;
}

async function buildCallbackFailureRedirect(reference, reason) {
  const payment = await findPaymentByReference(reference);

  if (!payment) {
    return `${env.clientUrl}?payment_status=failed&payment_reason=payment_not_found`;
  }

  if (payment.status === "PAID") {
    return buildFrontendRedirect(payment.product.slug, "paid", payment.reference);
  }

  return buildFrontendRedirect(payment.product.slug, "failed", payment.reference, reason);
}

export async function initiatePaymentCheckoutForProduct({
  slug,
  customerEmail,
  customerName,
  customerPhone,
  auditContext = {}
}) {
  const gateway = getPaymentGateway();
  const product = await findActiveProductBySlug(slug);
  const payment = await prisma.payment.create({
    data: {
      productId: product.id,
      sellerId: product.sellerId,
      provider: gateway.provider,
      reference: createPaymentReference(),
      amount: product.price,
      currency: env.paymentCurrency,
      customerEmail,
      customerName,
      customerPhone: customerPhone ?? null,
      status: "PENDING"
    }
  });

  try {
    const checkout = await gateway.createCheckout({
      payment: {
        ...payment,
        amount: formatDecimalValue(payment.amount)
      },
      product
    });

    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id
      },
      data: {
        checkoutUrl: checkout.checkoutUrl,
        providerPayload: checkout.providerPayload
      }
    });

    await writeAuditLog({
      ...auditContext,
      actorEmail: customerEmail,
      category: "PAYMENT",
      event: "PAYMENT_CHECKOUT_CREATED",
      outcome: "SUCCESS",
      resourceType: "PAYMENT",
      resourceId: updatedPayment.id,
      metadata: {
        reference: updatedPayment.reference,
        productId: updatedPayment.productId,
        sellerId: updatedPayment.sellerId,
        provider: updatedPayment.provider,
        amount: formatDecimalValue(updatedPayment.amount),
        currency: updatedPayment.currency,
        checkoutUrl: updatedPayment.checkoutUrl
      }
    });

    return {
      payment: serializePayment(updatedPayment),
      checkoutUrl: checkout.checkoutUrl
    };
  } catch (error) {
    await prisma.payment.update({
      where: {
        id: payment.id
      },
      data: {
        status: "FAILED",
        failureReason: error.message
      }
    });

    await writeAuditLog({
      ...auditContext,
      actorEmail: customerEmail,
      category: "PAYMENT",
      event: "PAYMENT_CHECKOUT_FAILED",
      outcome: "FAILURE",
      resourceType: "PAYMENT",
      resourceId: payment.id,
      metadata: {
        reference: payment.reference,
        productId: payment.productId,
        sellerId: payment.sellerId,
        provider: payment.provider,
        amount: formatDecimalValue(payment.amount),
        currency: payment.currency,
        reason: error.message
      }
    });

    throw error;
  }
}

export async function confirmPaymentByProviderReference({
  reference,
  transactionId,
  auditContext = {}
}) {
  const payment = await findPaymentByReference(reference);

  if (!payment) {
    throw createHttpError(404, "Payment not found");
  }

  const gateway = getPaymentGateway();

  if (payment.status === "PAID") {
    await writeAuditLog({
      ...auditContext,
      category: "PAYMENT",
      event: "PAYMENT_CONFIRMATION_ALREADY_PROCESSED",
      outcome: "INFO",
      resourceType: "PAYMENT",
      resourceId: payment.id,
      metadata: {
        reference: payment.reference,
        provider: payment.provider,
        providerTransactionId: payment.providerTransactionId
      }
    });

    return {
      payment: serializePayment(payment),
      product: payment.product
    };
  }

  const verification = await gateway.verifyTransaction({
    transactionId,
    payment: {
      ...payment,
      amount: formatDecimalValue(payment.amount)
    }
  });

  ensureVerificationMatches(payment, verification);

  const normalizedStatus = String(verification.status ?? "").toLowerCase();

  if (normalizedStatus === "successful" || normalizedStatus === "completed") {
    const updatedPayment = await persistSuccessfulPayment(payment, verification, auditContext);

    return {
      payment: serializePayment(updatedPayment),
      product: updatedPayment.product
    };
  }

  const failedPayment = await persistFailedPayment(
    payment,
    `Payment verification returned status: ${normalizedStatus || "unknown"}`,
    verification.rawData,
    auditContext
  );

  return {
    payment: serializePayment(failedPayment),
    product: failedPayment.product
  };
}

export async function failPaymentByReference({ reference, reason, auditContext = {} }) {
  const payment = await findPaymentByReference(reference);

  if (!payment) {
    throw createHttpError(404, "Payment not found");
  }

  const failedPayment = await persistFailedPayment(payment, reason, null, auditContext);

  return {
    payment: serializePayment(failedPayment),
    product: failedPayment.product
  };
}

export async function handleFlutterwaveCallback({
  status,
  txRef,
  transactionId,
  auditContext = {}
}) {
  if (!txRef) {
    return {
      redirectUrl: `${env.clientUrl}?payment_status=failed&payment_reason=missing_reference`
    };
  }

  try {
    if (status === "successful" && transactionId) {
      const result = await confirmPaymentByProviderReference({
        reference: txRef,
        transactionId,
        auditContext
      });

      return {
        redirectUrl: buildFrontendRedirect(
          result.product.slug,
          "paid",
          result.payment.reference
        )
      };
    }

    return {
      redirectUrl: await buildCallbackFailureRedirect(
        txRef,
        `Checkout status: ${status || "unknown"}`
      )
    };
  } catch (error) {
    if (error.statusCode === 404) {
      return {
        redirectUrl: `${env.clientUrl}?payment_status=failed&payment_reason=payment_not_found`
      };
    }

    return {
      redirectUrl: await buildCallbackFailureRedirect(txRef, "verification_failed")
    };
  }
}

export async function processFlutterwaveWebhookEvent(payload, auditContext = {}) {
  const event = payload?.event;
  const data = payload?.data;

  if (event !== "charge.completed" || !data?.tx_ref) {
    return {
      ignored: true
    };
  }

  if (!data.id) {
    return failPaymentByReference({
      reference: data.tx_ref,
      reason: `Webhook status: ${data.status || "unknown"}`,
      auditContext
    });
  }

  return confirmPaymentByProviderReference({
    reference: data.tx_ref,
    transactionId: String(data.id),
    auditContext
  });
}

export async function getMockCheckoutSessionByReference({
  reference,
  auditContext = {}
}) {
  ensureMockCheckoutEnabled();

  const payment = await findPaymentByReference(reference);

  if (!payment || payment.provider !== "MOCK") {
    throw createHttpError(404, "Payment not found");
  }

  await writeAuditLog({
    ...auditContext,
    actorEmail: payment.customerEmail,
    category: "PAYMENT",
    event: "PAYMENT_MOCK_CHECKOUT_VIEWED",
    outcome: "INFO",
    resourceType: "PAYMENT",
    resourceId: payment.id,
    metadata: {
      reference: payment.reference,
      productId: payment.productId,
      sellerId: payment.sellerId,
      status: payment.status,
      provider: payment.provider
    }
  });

  return {
    session: serializeMockCheckoutSession(payment)
  };
}

export async function completeMockCheckoutByReference({
  reference,
  auditContext = {}
}) {
  ensureMockCheckoutEnabled();

  const payment = await findPaymentByReference(reference);

  if (!payment || payment.provider !== "MOCK") {
    throw createHttpError(404, "Payment not found");
  }

  const result = await confirmPaymentByProviderReference({
    reference,
    transactionId: `mock-${payment.id}`,
    auditContext: {
      ...auditContext,
      actorEmail: payment.customerEmail
    }
  });

  return {
    payment: result.payment,
    receiptDownloadUrl: createReceiptAccess(result.payment.reference).downloadUrl,
    redirectUrl: buildFrontendRedirect(
      result.product.slug,
      "paid",
      result.payment.reference
    )
  };
}

function verifyReceiptAccessToken(reference, token) {
  try {
    const payload = verifyReceiptToken(token);

    if (payload.scope !== "payment-receipt" || payload.ref !== reference) {
      throw new Error("Receipt token does not match payment reference");
    }
  } catch (error) {
    throw createHttpError(403, "Receipt access denied", {
      code: "INVALID_RECEIPT_TOKEN"
    });
  }
}

export async function getPaymentReceiptByReference({
  reference,
  token,
  auditContext = {}
}) {
  try {
    verifyReceiptAccessToken(reference, token);
  } catch (error) {
    await writeAuditLog({
      ...auditContext,
      category: "SECURITY",
      event: "PAYMENT_RECEIPT_REJECTED",
      outcome: "FAILURE",
      resourceType: "PAYMENT",
      resourceId: reference,
      metadata: {
        reference,
        reason: "INVALID_RECEIPT_TOKEN"
      }
    });

    throw error;
  }

  const payment = await prisma.payment.findUnique({
    where: {
      reference
    },
    include: {
      product: {
        select: {
          name: true,
          description: true
        }
      },
      seller: {
        select: {
          fullName: true,
          businessName: true
        }
      }
    }
  });

  if (!payment) {
    throw createHttpError(404, "Payment not found");
  }

  if (payment.status !== "PAID" || !payment.paidAt) {
    await writeAuditLog({
      ...auditContext,
      actorEmail: payment.customerEmail,
      category: "SECURITY",
      event: "PAYMENT_RECEIPT_REJECTED",
      outcome: "FAILURE",
      resourceType: "PAYMENT",
      resourceId: payment.id,
      metadata: {
        reference: payment.reference,
        reason: "PAYMENT_NOT_CONFIRMED"
      }
    });

    throw createHttpError(409, "Receipt not available for this payment", {
      code: "RECEIPT_NOT_AVAILABLE"
    });
  }

  const fileBuffer = await generatePaymentReceiptPdf({
    reference: payment.reference,
    amount: formatDecimalValue(payment.amount),
    currency: payment.currency,
    customerEmail: payment.customerEmail,
    customerName: payment.customerName,
    customerPhone: payment.customerPhone,
    paidAt: payment.paidAt,
    product: payment.product,
    seller: payment.seller
  });

  await writeAuditLog({
    ...auditContext,
    actorEmail: payment.customerEmail,
    category: "PAYMENT",
    event: "PAYMENT_RECEIPT_DOWNLOADED",
    outcome: "SUCCESS",
    resourceType: "PAYMENT",
    resourceId: payment.id,
    metadata: {
      reference: payment.reference,
      sellerId: payment.sellerId,
      productId: payment.productId
    }
  });

  return {
    buffer: fileBuffer,
    fileName: `receipt-${payment.reference}.pdf`
  };
}
