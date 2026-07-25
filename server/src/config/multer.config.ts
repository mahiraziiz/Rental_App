import multer from "multer";
import path from "path";

// Configure storage (memory storage for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|heic/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// Multer configuration
const multerConfig = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Export configured multer instance
export const upload = multerConfig;

// Export single and multiple upload middleware
export const uploadSingle = multerConfig.single("image");
export const uploadArray = multerConfig.array("images", 10); // Max 10 images
export const uploadFields = multerConfig.fields([
  { name: "images", maxCount: 10 },
]);

export default multerConfig;
