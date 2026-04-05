import {
  createSellerProduct,
  deleteSellerProduct,
  getPublicProduct,
  getSellerProductDetail,
  listSellerProducts,
  updateSellerProduct,
  updateSellerProductStatus
} from "./payment-link.service.js";
import { initiatePaymentCheckoutForProduct } from "../payments/payment.service.js";
import { buildAuditContext } from "../../lib/audit-log.js";

export async function listSellerPaymentLinks(req, res, next) {
  try {
    const result = await listSellerProducts(req.user.sub);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getSellerPaymentLinkDetail(req, res, next) {
  try {
    const item = await getSellerProductDetail({
      sellerId: req.user.sub,
      productId: req.validated.params.productId
    });

    return res.status(200).json({
      item
    });
  } catch (error) {
    return next(error);
  }
}

export async function createPaymentLink(req, res, next) {
  try {
    const { name, price, description } = req.validated.body;

    const item = await createSellerProduct({
      sellerId: req.user.sub,
      name,
      description,
      price
    });

    return res.status(201).json({
      message: "Payment link created successfully",
      item
    });
  } catch (error) {
    return next(error);
  }
}

export async function updatePaymentLink(req, res, next) {
  try {
    const updatePayload = req.validated.body;
    const item = await updateSellerProduct({
      sellerId: req.user.sub,
      productId: req.validated.params.productId,
      ...updatePayload
    });

    return res.status(200).json({
      message: "Payment link updated successfully",
      item
    });
  } catch (error) {
    return next(error);
  }
}

export async function updatePaymentLinkStatus(req, res, next) {
  try {
    const { isActive } = req.validated.body;

    const item = await updateSellerProductStatus({
      sellerId: req.user.sub,
      productId: req.validated.params.productId,
      isActive
    });

    return res.status(200).json({
      message: `Payment link ${isActive ? "activated" : "deactivated"} successfully`,
      item
    });
  } catch (error) {
    return next(error);
  }
}

export async function deletePaymentLink(req, res, next) {
  try {
    const result = await deleteSellerProduct({
      sellerId: req.user.sub,
      productId: req.validated.params.productId
    });

    return res.status(200).json({
      message: "Payment link deleted successfully",
      ...result
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPublicPaymentLink(req, res, next) {
  try {
    const item = await getPublicProduct(req.validated.params.slug);

    return res.status(200).json({
      item
    });
  } catch (error) {
    return next(error);
  }
}

export async function createPaymentCheckout(req, res, next) {
  try {
    const { customerEmail, customerName, customerPhone } = req.validated.body;
    const result = await initiatePaymentCheckoutForProduct({
      slug: req.validated.params.slug,
      customerEmail,
      customerName,
      customerPhone,
      auditContext: buildAuditContext(req)
    });

    return res.status(201).json({
      message: "Payment checkout created successfully",
      ...result
    });
  } catch (error) {
    return next(error);
  }
}
