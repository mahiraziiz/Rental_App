import { Router } from "express";
import { Register, Login, me } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", Register);
router.post("/login", Login);
router.get("/me", authMiddleware(), me);

export default router;
