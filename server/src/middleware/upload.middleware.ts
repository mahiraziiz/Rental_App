import multer from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, "uploads/");
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// ✅ Fixed middleware with proper types
export const uploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.array("images", 10)(req, res, (err: any) => {
    if (err) {
      // Check error code properly
      if (err.code === "FILE_TOO_LARGE") {
        res.status(400).json({ error: "File too large. Max size is 5MB." });
        return;
      }
      if (err.message === "Only image files are allowed!") {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: err.message });
      return;
    }
    next();
  });
};

export default uploadMiddleware;
