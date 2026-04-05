import { createHttpError } from "../../lib/errors.js";
import { buildAuditContext, writeAuditLog } from "../../lib/audit-log.js";
import { getPaymentGateway } from "./payment-gateway.js";
import {
  completeMockCheckoutByReference,
  getPaymentReceiptByReference,
  handleFlutterwaveCallback,
  getMockCheckoutSessionByReference,
  processFlutterwaveWebhookEvent
} from "./payment.service.js";

export async function getMockCheckoutSession(req, res, next) {
  try {
    const result = await getMockCheckoutSessionByReference({
      reference: req.validated.params.reference,
      auditContext: buildAuditContext(req)
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function completeMockCheckout(req, res, next) {
  try {
    const result = await completeMockCheckoutByReference({
      reference: req.validated.params.reference,
      auditContext: buildAuditContext(req)
    });

    return res.status(200).json({
      message: "Mock checkout completed successfully",
      ...result
    });
  } catch (error) {
    return next(error);
  }
}

export async function flutterwaveCallback(req, res, next) {
  try {
    const callback = await handleFlutterwaveCallback({
      status: req.validated.query.status,
      txRef: req.validated.query.tx_ref,
      transactionId: req.validated.query.transaction_id,
      auditContext: buildAuditContext(req)
    });

    return res.redirect(302, callback.redirectUrl);
  } catch (error) {
    return next(error);
  }
}

export async function flutterwaveWebhook(req, res, next) {
  try {
    const gateway = getPaymentGateway();

    if (!gateway.isValidWebhookSignature(req)) {
      await writeAuditLog({
        ...buildAuditContext(req),
        category: "SECURITY",
        event: "PAYMENT_WEBHOOK_REJECTED",
        outcome: "FAILURE",
        resourceType: "PAYMENT_WEBHOOK",
        metadata: {
          provider: gateway.provider,
          reason: "INVALID_SIGNATURE"
        }
      });

      throw createHttpError(401, "Invalid webhook signature", {
        code: "INVALID_WEBHOOK_SIGNATURE"
      });
    }

    await processFlutterwaveWebhookEvent(req.body, buildAuditContext(req));

    return res.status(200).json({
      message: "Webhook processed"
    });
  } catch (error) {
    return next(error);
  }
}

export async function downloadPaymentReceipt(req, res, next) {
  try {
    const result = await getPaymentReceiptByReference({
      reference: req.validated.params.reference,
      token: req.validated.query.token,
      auditContext: buildAuditContext(req)
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${result.fileName}\"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(result.buffer);
  } catch (error) {
    return next(error);
  }
}
