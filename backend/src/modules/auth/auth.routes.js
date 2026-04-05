import { Router } from "express";
import { validateRequest } from "../../lib/validation.js";
import { requireAuth, requireCsrf } from "../../middlewares/auth.middleware.js";
import {
  loginRateLimiter,
  registerRateLimiter
} from "../../middlewares/rate-limit.middleware.js";
import { login, logout, me, register } from "./auth.controller.js";
import { loginBodySchema, registerBodySchema } from "./auth.validation.js";

const router = Router();

router.post(
  "/register",
  registerRateLimiter,
  validateRequest({
    bodySchema: registerBodySchema
  }),
  register
);
router.post(
  "/login",
  loginRateLimiter,
  validateRequest({
    bodySchema: loginBodySchema
  }),
  login
);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, requireCsrf, logout);

export default router;
