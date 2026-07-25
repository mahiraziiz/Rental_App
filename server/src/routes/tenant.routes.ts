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

const router = express.Router();

router.get("/:id", getTenant);
router.delete("/:id", deleteTenant);
router.put("/:id", updateTenant);
router.post("/", createTenant);
router.get("/:id/current-residences", getCurrentResidences);
router.post("/:id/favorites/:propertyId", addFavoriteProperty);
router.delete("/:id/favorites/:propertyId", removeFavoriteProperty);

export default router;
