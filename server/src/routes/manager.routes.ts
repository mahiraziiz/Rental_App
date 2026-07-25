import express from "express";
import {
  getManager,
  createManager,
  updateManager,
  deleteManager,
  getManagerProperties,
} from "../controllers/manager.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Public routes
router.get("/:id", getManager);
router.post("/", createManager);

// Protected routes
router.use(authMiddleware(["manager"]));
router.put("/:id", updateManager);
router.delete("/:id", deleteManager);
router.get("/:id/properties", getManagerProperties);

export default router;
