import multer from "multer";
import { Request } from "express";
import { AppError } from "../utils/AppError";
import {
    uploadImageToCloudinary,
    deleteImageFromCloudinary,
    extractPublicIdFromUrl,
    validateCloudinaryConfig
} from "../config/cloudinary";

// Validate Cloudinary configuration on startup
if (!validateCloudinaryConfig()) {
    throw new Error("Cloudinary configuration is required for image uploads");
}

// Configure multer for memory storage (files will be uploaded to Cloudinary)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
        // Allow specific image formats
        const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError("Only JPEG, PNG, and WebP images are allowed", 400));
        }
    } else {
        cb(new AppError("Only image files are allowed", 400));
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 5 // Maximum 5 files per request
    }
});

// Middleware for uploading multiple images
export const uploadProductImages = upload.array("images", 5);

// Error handling middleware for multer
export const handleMulterError = (error: any, req: Request, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return next(new AppError("File size too large. Maximum size is 5MB per file", 400));
        }
        if (error.code === "LIMIT_FILE_COUNT") {
            return next(new AppError("Too many files. Maximum 5 files allowed", 400));
        }
        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return next(new AppError('Unexpected field name. Use "images" field for file uploads', 400));
        }
        return next(new AppError(`Upload error: ${error.message}`, 400));
    }
    next(error);
};

// Upload image to Cloudinary
export const uploadToCloudinary = async (
    file: Express.Multer.File
): Promise<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}> => {
    try {
        const result = await uploadImageToCloudinary(file.buffer);
        return {
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        };
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw new AppError("Failed to upload image to cloud storage", 500);
    }
};

// Delete image from Cloudinary
export const deleteCloudinaryImage = async (url: string): Promise<void> => {
    try {
        const publicId = extractPublicIdFromUrl(url);
        await deleteImageFromCloudinary(publicId);
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        // Don't throw error here to avoid breaking the flow if image is already deleted
    }
};

// Helper function to extract public_id from Cloudinary URL
export const getPublicIdFromUrl = (url: string): string => {
    return extractPublicIdFromUrl(url);
};
