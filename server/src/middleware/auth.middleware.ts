import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (allowedRoles: string[] = []) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        res.status(401).json({ error: "No token provided" });
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      ) as JwtPayload;

      // Check if user has required role
      if (allowedRoles.length > 0 && decoded.role) {
        if (!allowedRoles.includes(decoded.role as string)) {
          res.status(403).json({ error: "Insufficient permissions" });
          return;
        }
      }

      // Set user in request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
      res.status(401).json({ error: "Unauthorized" });
    }
  };
};

// Optional auth middleware
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      ) as JwtPayload;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    }
    next();
  } catch {
    next();
  }
};
