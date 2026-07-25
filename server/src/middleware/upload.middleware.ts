import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadArray, uploadSingle } from "../config/multer.config";

// Error handler for multer
export const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "FILE_TOO_LARGE") {
      return res.status(400).json({
        message: "File too large. Maximum size is 5MB.",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Unexpected file field.",
      });
    }
    return res.status(400).json({
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      message: err.message,
    });
  }

  next();
};

// Middleware for single file upload
export const uploadSingleImage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  uploadSingle(req, res, (err: any) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
};

// Middleware for multiple file upload (max 10)
export const uploadMultipleImages = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  uploadArray(req, res, (err: any) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
};

export default {
  uploadSingleImage,
  uploadMultipleImages,
  handleMulterError,
};
