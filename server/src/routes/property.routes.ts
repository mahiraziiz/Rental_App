import express from "express";
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} from "../controllers/property.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Public routes
router.get("/", getProperties);
router.get("/:id", getProperty);

// Protected routes
router.use(authMiddleware(["manager"]));
router.post("/", createProperty);
router.put("/:id", updateProperty);
router.delete("/:id", deleteProperty);

export default router;
