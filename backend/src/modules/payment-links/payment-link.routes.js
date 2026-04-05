import { Router } from "express";
import { validateRequest } from "../../lib/validation.js";
import { requireAuth, requireCsrf } from "../../middlewares/auth.middleware.js";
import { paymentCheckoutRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import {
  createPaymentCheckout,
  createPaymentLink,
  deletePaymentLink,
  getPublicPaymentLink,
  getSellerPaymentLinkDetail,
  listSellerPaymentLinks,
  updatePaymentLink,
  updatePaymentLinkStatus
} from "./payment-link.controller.js";
import {
  createPaymentLinkBodySchema,
  initiatePaymentBodySchema,
  publicSlugParamsSchema,
  sellerProductParamsSchema,
  updatePaymentLinkBodySchema,
  updatePaymentLinkStatusBodySchema
} from "./payment-link.validation.js";

const router = Router();

router.get("/", requireAuth, listSellerPaymentLinks);
router.post(
  "/",
  requireAuth,
  requireCsrf,
  validateRequest({
    bodySchema: createPaymentLinkBodySchema
  }),
  createPaymentLink
);
router.get(
  "/mine/:productId",
  requireAuth,
  validateRequest({
    paramsSchema: sellerProductParamsSchema
  }),
  getSellerPaymentLinkDetail
);
router.patch(
  "/mine/:productId",
  requireAuth,
  requireCsrf,
  validateRequest({
    paramsSchema: sellerProductParamsSchema,
    bodySchema: updatePaymentLinkBodySchema,
    bodyOptions: {
      partial: true
    }
  }),
  updatePaymentLink
);
router.patch(
  "/mine/:productId/status",
  requireAuth,
  requireCsrf,
  validateRequest({
    paramsSchema: sellerProductParamsSchema,
    bodySchema: updatePaymentLinkStatusBodySchema
  }),
  updatePaymentLinkStatus
);
router.delete(
  "/mine/:productId",
  requireAuth,
  requireCsrf,
  validateRequest({
    paramsSchema: sellerProductParamsSchema
  }),
  deletePaymentLink
);
router.post(
  "/:slug/pay",
  paymentCheckoutRateLimiter,
  validateRequest({
    paramsSchema: publicSlugParamsSchema,
    bodySchema: initiatePaymentBodySchema
  }),
  createPaymentCheckout
);
router.get(
  "/:slug",
  validateRequest({
    paramsSchema: publicSlugParamsSchema
  }),
  getPublicPaymentLink
);

export default router;
