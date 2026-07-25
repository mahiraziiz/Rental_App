import { Router } from "express";
import { Register, Login, Me, Logout } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", Register);
router.post("/login", Login);
router.post("/logout", authMiddleware(), Logout);
router.get("/me", authMiddleware(), Me);

export default router;