import express from "express";
import {
  getLeases,
  getPropertyLeases,
  getPayments,
} from "../controllers/lease.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Protected routes
router.use(authMiddleware(["tenant", "manager"]));
router.get("/", getLeases);
router.get("/property/:propertyId", getPropertyLeases);
router.get("/:leaseId/payments", getPayments);

export default router;
