import { Router } from "express";
import { validateRequest } from "../../lib/validation.js";
import {
  completeMockCheckout,
  downloadPaymentReceipt,
  flutterwaveCallback,
  flutterwaveWebhook,
  getMockCheckoutSession
} from "./payment.controller.js";
import {
  flutterwaveCallbackQuerySchema,
  paymentReceiptQuerySchema,
  paymentReferenceParamsSchema
} from "./payment.validation.js";

const router = Router();

router.get(
  "/mock/:reference",
  validateRequest({
    paramsSchema: paymentReferenceParamsSchema
  }),
  getMockCheckoutSession
);
router.post(
  "/mock/:reference/complete",
  validateRequest({
    paramsSchema: paymentReferenceParamsSchema
  }),
  completeMockCheckout
);
router.get(
  "/:reference/receipt",
  validateRequest({
    paramsSchema: paymentReferenceParamsSchema,
    querySchema: paymentReceiptQuerySchema
  }),
  downloadPaymentReceipt
);
router.get(
  "/flutterwave/callback",
  validateRequest({
    querySchema: flutterwaveCallbackQuerySchema,
    queryOptions: {
      partial: true,
      minKnownFields: 0
    }
  }),
  flutterwaveCallback
);
router.post("/flutterwave/webhook", flutterwaveWebhook);

export default router;
