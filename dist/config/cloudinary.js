"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinary = exports.validateCloudinaryConfig = exports.generateOptimizedImageUrl = exports.extractPublicIdFromUrl = exports.deleteImageFromCloudinary = exports.uploadImageToCloudinary = exports.productImageUploadOptions = void 0;
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
// Cloudinary configuration
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'duw5dconp',
    api_key: process.env.CLOUDINARY_API_KEY || '942933336542189',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'eSq2FUrATreexQ_upzYyI63eB4U'
});
// Upload options for product images
exports.productImageUploadOptions = {
    folder: 'shopdev/products',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' },
        { format: 'auto' }
    ]
};
// Upload image to Cloudinary
const uploadImageToCloudinary = async (fileBuffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            ...exports.productImageUploadOptions,
            ...options
        };
        cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
                reject(error);
            }
            else if (result) {
                resolve({
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    bytes: result.bytes
                });
            }
            else {
                reject(new Error('Upload failed - no result returned'));
            }
        }).end(fileBuffer);
    });
};
exports.uploadImageToCloudinary = uploadImageToCloudinary;
// Delete image from Cloudinary
const deleteImageFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary_1.v2.uploader.destroy(publicId);
        if (result.result !== 'ok') {
            throw new Error(`Failed to delete image: ${result.result}`);
        }
    }
    catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};
exports.deleteImageFromCloudinary = deleteImageFromCloudinary;
// Extract public_id from Cloudinary URL
const extractPublicIdFromUrl = (url) => {
    try {
        // Cloudinary URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.ext
        const urlParts = url.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex === -1) {
            throw new Error('Invalid Cloudinary URL format');
        }
        // Get everything after 'upload' and version (if present)
        let pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
        // Remove version if present (starts with 'v' followed by numbers)
        if (pathAfterUpload.match(/^v\d+\//)) {
            pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
        }
        // Remove file extension
        const lastDotIndex = pathAfterUpload.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            pathAfterUpload = pathAfterUpload.substring(0, lastDotIndex);
        }
        return pathAfterUpload;
    }
    catch (error) {
        console.error('Error extracting public_id from URL:', url, error);
        throw new Error('Failed to extract public_id from Cloudinary URL');
    }
};
exports.extractPublicIdFromUrl = extractPublicIdFromUrl;
// Generate optimized image URL with transformations
const generateOptimizedImageUrl = (publicId, options = {}) => {
    const { width = 800, height = 800, crop = 'limit', quality = 'auto:good', format = 'auto' } = options;
    return cloudinary_1.v2.url(publicId, {
        width,
        height,
        crop,
        quality,
        format,
        secure: true
    });
};
exports.generateOptimizedImageUrl = generateOptimizedImageUrl;
// Validate Cloudinary configuration
const validateCloudinaryConfig = () => {
    const { cloud_name, api_key, api_secret } = cloudinary_1.v2.config();
    if (!cloud_name || !api_key || !api_secret) {
        console.error('Cloudinary configuration is incomplete');
        return false;
    }
    return true;
};
exports.validateCloudinaryConfig = validateCloudinaryConfig;
