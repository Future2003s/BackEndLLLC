"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductImages = exports.updateProductImageMetadata = exports.uploadProductImages = void 0;
const Product_1 = require("../models/Product");
const AppError_1 = require("../utils/AppError");
const asyncHandler_1 = require("../utils/asyncHandler");
const upload_1 = require("../middleware/upload");
const imageHelpers_1 = require("../utils/imageHelpers");
// POST /api/v1/products/:id/images - Upload images to Cloudinary
exports.uploadProductImages = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id: productId } = req.params;
    const files = req.files;
    // Validate files exist
    if (!files || files.length === 0) {
        return next(new AppError_1.AppError("No images provided", 400));
    }
    // Find product
    const product = await Product_1.Product.findById(productId);
    if (!product) {
        return next(new AppError_1.AppError("Product not found", 404));
    }
    // Check if user has permission to modify this product
    if (req.user.role !== "admin" && product.createdBy.toString() !== req.user.id) {
        return next(new AppError_1.AppError("Not authorized to modify this product", 403));
    }
    try {
        // Validate image limits
        (0, imageHelpers_1.validateImageLimits)(product.images, files.length);
        // Upload images to Cloudinary
        const uploadPromises = files.map((file) => (0, upload_1.uploadToCloudinary)(file));
        const uploadResults = await Promise.all(uploadPromises);
        // Generate metadata for new images
        const currentMaxOrder = product.images.length > 0 ? Math.max(...product.images.map((img) => img.order || 0)) : -1;
        const newImages = (0, imageHelpers_1.generateImageMetadata)(uploadResults, currentMaxOrder + 1);
        // Add new images to product
        product.images.push(...newImages);
        // Set first image as main if no main image exists
        product.images = (0, imageHelpers_1.setFirstAsMainIfNeeded)(product.images);
        // Sort images by order
        product.images = (0, imageHelpers_1.sortImagesByOrder)(product.images);
        // Update updatedBy field
        product.updatedBy = req.user.id;
        // Save product
        await product.save();
        res.status(201).json({
            success: true,
            message: `Successfully uploaded ${files.length} image(s) to Cloudinary`,
            data: product
        });
    }
    catch (error) {
        console.error("Cloudinary upload error:", error);
        if (error instanceof Error) {
            return next(new AppError_1.AppError(error.message, 400));
        }
        return next(new AppError_1.AppError("Failed to upload images to cloud storage", 500));
    }
});
// PUT /api/v1/products/:id/images - Update image metadata
exports.updateProductImageMetadata = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id: productId } = req.params;
    const { images: imageUpdates } = req.body;
    // Validate request body
    if (!imageUpdates || !Array.isArray(imageUpdates)) {
        return next(new AppError_1.AppError("Images array is required", 400));
    }
    try {
        // Validate image update request
        (0, imageHelpers_1.validateImageUpdateRequest)(imageUpdates);
    }
    catch (error) {
        if (error instanceof Error) {
            return next(new AppError_1.AppError(error.message, 400));
        }
        return next(new AppError_1.AppError("Invalid update request", 400));
    }
    // Find product
    const product = await Product_1.Product.findById(productId);
    if (!product) {
        return next(new AppError_1.AppError("Product not found", 404));
    }
    // Check if user has permission to modify this product
    if (req.user.role !== "admin" && product.createdBy.toString() !== req.user.id) {
        return next(new AppError_1.AppError("Not authorized to modify this product", 403));
    }
    // Verify all image IDs exist
    const imageIds = imageUpdates.map((update) => update.imageId);
    const existingImages = (0, imageHelpers_1.findImagesByIds)(product.images, imageIds);
    if (existingImages.length !== imageIds.length) {
        return next(new AppError_1.AppError("One or more image IDs not found", 404));
    }
    // Update image metadata
    product.images = (0, imageHelpers_1.updateImageMetadata)(product.images, imageUpdates);
    // Sort images by order
    product.images = (0, imageHelpers_1.sortImagesByOrder)(product.images);
    // Update updatedBy field
    product.updatedBy = req.user.id;
    // Save product
    await product.save();
    res.status(200).json({
        success: true,
        message: "Image metadata updated successfully",
        data: product
    });
});
// DELETE /api/v1/products/:id/images - Delete images from Cloudinary
exports.deleteProductImages = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id: productId } = req.params;
    const { imageIds } = req.body;
    // Validate request body
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return next(new AppError_1.AppError("imageIds array is required and cannot be empty", 400));
    }
    // Find product
    const product = await Product_1.Product.findById(productId);
    if (!product) {
        return next(new AppError_1.AppError("Product not found", 404));
    }
    // Check if user has permission to modify this product
    if (req.user.role !== "admin" && product.createdBy.toString() !== req.user.id) {
        return next(new AppError_1.AppError("Not authorized to modify this product", 403));
    }
    // Find images to delete
    const imagesToDelete = (0, imageHelpers_1.findImagesByIds)(product.images, imageIds);
    if (imagesToDelete.length === 0) {
        return next(new AppError_1.AppError("No images found with provided IDs", 404));
    }
    // Check if we're deleting the main image
    const deletingMainImage = imagesToDelete.some((img) => img.isMain);
    // Remove images from product
    product.images = (0, imageHelpers_1.removeImagesByIds)(product.images, imageIds);
    // If we deleted the main image and there are still images left, set first as main
    if (deletingMainImage && product.images.length > 0) {
        product.images = (0, imageHelpers_1.setFirstAsMainIfNeeded)(product.images);
    }
    // Sort remaining images by order
    product.images = (0, imageHelpers_1.sortImagesByOrder)(product.images);
    // Update updatedBy field
    product.updatedBy = req.user.id;
    // Save product
    await product.save();
    // Clean up physical files from Cloudinary (async, don't wait)
    const imageUrls = imagesToDelete.map((img) => img.url);
    (0, imageHelpers_1.cleanupImageFiles)(imageUrls).catch((error) => {
        console.error("Error cleaning up Cloudinary images:", error);
    });
    res.status(200).json({
        success: true,
        message: `Successfully deleted ${imagesToDelete.length} image(s) from Cloudinary`,
        data: product
    });
});
