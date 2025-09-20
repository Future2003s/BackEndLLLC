"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicIdFromUrl = exports.deleteCloudinaryImage = exports.uploadToCloudinary = exports.handleMulterError = exports.uploadProductImages = void 0;
const multer_1 = __importDefault(require("multer"));
const AppError_1 = require("../utils/AppError");
const cloudinary_1 = require("../config/cloudinary");
// Validate Cloudinary configuration on startup
if (!(0, cloudinary_1.validateCloudinaryConfig)()) {
    throw new Error("Cloudinary configuration is required for image uploads");
}
// Configure multer for memory storage (files will be uploaded to Cloudinary)
const storage = multer_1.default.memoryStorage();
// File filter for images only
const fileFilter = (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
        // Allow specific image formats
        const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new AppError_1.AppError("Only JPEG, PNG, and WebP images are allowed", 400));
        }
    }
    else {
        cb(new AppError_1.AppError("Only image files are allowed", 400));
    }
};
// Configure multer
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 5 // Maximum 5 files per request
    }
});
// Middleware for uploading multiple images
exports.uploadProductImages = upload.array("images", 5);
// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return next(new AppError_1.AppError("File size too large. Maximum size is 5MB per file", 400));
        }
        if (error.code === "LIMIT_FILE_COUNT") {
            return next(new AppError_1.AppError("Too many files. Maximum 5 files allowed", 400));
        }
        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return next(new AppError_1.AppError('Unexpected field name. Use "images" field for file uploads', 400));
        }
        return next(new AppError_1.AppError(`Upload error: ${error.message}`, 400));
    }
    next(error);
};
exports.handleMulterError = handleMulterError;
// Upload image to Cloudinary
const uploadToCloudinary = async (file) => {
    try {
        const result = await (0, cloudinary_1.uploadImageToCloudinary)(file.buffer);
        return {
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        };
    }
    catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw new AppError_1.AppError("Failed to upload image to cloud storage", 500);
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
// Delete image from Cloudinary
const deleteCloudinaryImage = async (url) => {
    try {
        const publicId = (0, cloudinary_1.extractPublicIdFromUrl)(url);
        await (0, cloudinary_1.deleteImageFromCloudinary)(publicId);
    }
    catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        // Don't throw error here to avoid breaking the flow if image is already deleted
    }
};
exports.deleteCloudinaryImage = deleteCloudinaryImage;
// Helper function to extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
    return (0, cloudinary_1.extractPublicIdFromUrl)(url);
};
exports.getPublicIdFromUrl = getPublicIdFromUrl;
