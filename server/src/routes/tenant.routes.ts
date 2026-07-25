import express from "express";
import {
  getTenant,
  createTenant,
  updateTenant,
  getCurrentResidences,
  addFavoriteProperty,
  removeFavoriteProperty,
  deleteTenant,
} from "../controllers/tenant.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Public routes
router.get("/:id", getTenant);
router.post("/", createTenant);

// Protected routes
router.use(authMiddleware(["tenant", "manager"]));
router.put("/:id", updateTenant);
router.delete("/:id", deleteTenant);
router.get("/:id/current-residences", getCurrentResidences);
router.post("/:userId/favorites/:propertyId", addFavoriteProperty);
router.delete("/:userId/favorites/:propertyId", removeFavoriteProperty);

export default router;
