import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import healthRoutes from "../modules/health/health.routes.js";
import paymentRoutes from "../modules/payments/payment.routes.js";
import paymentLinkRoutes from "../modules/payment-links/payment-link.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/payments", paymentRoutes);
apiRouter.use("/payment-links", paymentLinkRoutes);

export { apiRouter };
