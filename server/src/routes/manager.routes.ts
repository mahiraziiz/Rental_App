import express from "express";
import {
  getManager,
  createManager,
  updateManager,
  deleteManager,
  getManagerProperties,
} from "../controllers/manager.controller";

const router = express.Router();

router.get("/:id", getManager);
router.put("/:id", updateManager);
router.delete("/:id", deleteManager);
router.get("/:id/properties", getManagerProperties);
router.post("/", createManager);

export default router;