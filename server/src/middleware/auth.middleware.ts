import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (allowedRoles: string[] = []) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        res.status(401).json({ error: "No token provided" });
        return;
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      ) as any;

      // Check if user has required role
      if (
        allowedRoles.length > 0 &&
        decoded.role &&
        !allowedRoles.includes(decoded.role)
      ) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }

      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  };
};
