import express from "express";
import {
  getApplications,
  createApplication,
  updateApplicationStatus,
} from "../controllers/application.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Protected routes
router.use(authMiddleware(["tenant", "manager"]));
router.get("/", getApplications);
router.post("/", createApplication);
router.put("/:id/status", updateApplicationStatus);

export default router;
