import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Readable } from "stream";
import cloudinaryConfig from "../config/cloudinary.config";

// Re-export cloudinary config
export { cloudinaryConfig };

export interface UploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: "auto" | "image" | "video" | "raw";
  transformation?: any[];
}

export class UploadService {
  /**
   * Upload a single file buffer to Cloudinary
   */
  static async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    options: UploadOptions = {},
  ): Promise<string> {
    const {
      folder = "properties",
      resource_type = "auto",
      transformation = [{ quality: "auto:good" }, { fetch_format: "auto" }],
    } = options;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id:
            options.public_id || `${Date.now()}-${originalName.split(".")[0]}`,
          resource_type: resource_type,
          transformation: transformation,
        },
        (error: any, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve(result?.secure_url || "");
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Upload multiple files to Cloudinary
   */
  static async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = "properties",
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      return ["https://placehold.co/1200x800?text=Property+Photo"];
    }

    const hasCloudinaryConfig = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!hasCloudinaryConfig) {
      console.warn("Cloudinary not configured, using placeholder images");
      return files.map(
        () => "https://placehold.co/1200x800?text=Property+Photo",
      );
    }

    try {
      const uploadPromises = files.map((file) =>
        this.uploadFile(file.buffer, file.originalname, { folder }),
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      return files.map(
        () => "https://placehold.co/1200x800?text=Property+Photo",
      );
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  static async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error) {
      console.error("Error deleting file from Cloudinary:", error);
      return false;
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  static extractPublicIdFromUrl(url: string): string | null {
    try {
      const parts = url.split("/");
      const fileName = parts[parts.length - 1];
      const publicId = fileName.split(".")[0];
      return publicId;
    } catch (error) {
      return null;
    }
  }
}

export default UploadService;
