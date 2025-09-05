import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { 
    uploadToCloudinary, 
    deleteCloudinaryImage, 
    getPublicIdFromUrl 
} from '../middleware/upload';
import {
    validateImageLimits,
    generateImageMetadata,
    setFirstAsMainIfNeeded,
    cleanupImageFiles,
    findImagesByIds,
    removeImagesByIds,
    updateImageMetadata,
    validateImageUpdateRequest,
    sortImagesByOrder
} from '../utils/imageHelpers';

// POST /api/v1/products/:id/images - Upload images to Cloudinary
export const uploadProductImages = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id: productId } = req.params;
        const files = req.files as Express.Multer.File[];

        // Validate files exist
        if (!files || files.length === 0) {
            return next(new AppError('No images provided', 400));
        }

        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return next(new AppError('Product not found', 404));
        }

        // Check if user has permission to modify this product
        if (req.user.role !== 'admin' && product.createdBy.toString() !== req.user.id) {
            return next(new AppError('Not authorized to modify this product', 403));
        }

        try {
            // Validate image limits
            validateImageLimits(product.images, files.length);

            // Upload images to Cloudinary
            const uploadPromises = files.map(file => uploadToCloudinary(file));
            const uploadResults = await Promise.all(uploadPromises);

            // Generate metadata for new images
            const currentMaxOrder = product.images.length > 0 
                ? Math.max(...product.images.map(img => img.order || 0))
                : -1;
            
            const newImages = generateImageMetadata(uploadResults, currentMaxOrder + 1);

            // Add new images to product
            product.images.push(...newImages);

            // Set first image as main if no main image exists
            product.images = setFirstAsMainIfNeeded(product.images);

            // Sort images by order
            product.images = sortImagesByOrder(product.images);

            // Update updatedBy field
            product.updatedBy = req.user.id;

            // Save product
            await product.save();

            res.status(201).json({
                success: true,
                message: `Successfully uploaded ${files.length} image(s) to Cloudinary`,
                data: product
            });

        } catch (error) {
            console.error('Cloudinary upload error:', error);
            
            if (error instanceof Error) {
                return next(new AppError(error.message, 400));
            }
            return next(new AppError('Failed to upload images to cloud storage', 500));
        }
    }
);

// PUT /api/v1/products/:id/images - Update image metadata
export const updateProductImageMetadata = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id: productId } = req.params;
        const { images: imageUpdates } = req.body;

        // Validate request body
        if (!imageUpdates || !Array.isArray(imageUpdates)) {
            return next(new AppError('Images array is required', 400));
        }

        try {
            // Validate image update request
            validateImageUpdateRequest(imageUpdates);
        } catch (error) {
            if (error instanceof Error) {
                return next(new AppError(error.message, 400));
            }
            return next(new AppError('Invalid update request', 400));
        }

        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return next(new AppError('Product not found', 404));
        }

        // Check if user has permission to modify this product
        if (req.user.role !== 'admin' && product.createdBy.toString() !== req.user.id) {
            return next(new AppError('Not authorized to modify this product', 403));
        }

        // Verify all image IDs exist
        const imageIds = imageUpdates.map(update => update.imageId);
        const existingImages = findImagesByIds(product.images, imageIds);
        
        if (existingImages.length !== imageIds.length) {
            return next(new AppError('One or more image IDs not found', 404));
        }

        // Update image metadata
        product.images = updateImageMetadata(product.images, imageUpdates);

        // Sort images by order
        product.images = sortImagesByOrder(product.images);

        // Update updatedBy field
        product.updatedBy = req.user.id;

        // Save product
        await product.save();

        res.status(200).json({
            success: true,
            message: 'Image metadata updated successfully',
            data: product
        });
    }
);

// DELETE /api/v1/products/:id/images - Delete images from Cloudinary
export const deleteProductImages = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id: productId } = req.params;
        const { imageIds } = req.body;

        // Validate request body
        if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
            return next(new AppError('imageIds array is required and cannot be empty', 400));
        }

        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return next(new AppError('Product not found', 404));
        }

        // Check if user has permission to modify this product
        if (req.user.role !== 'admin' && product.createdBy.toString() !== req.user.id) {
            return next(new AppError('Not authorized to modify this product', 403));
        }

        // Find images to delete
        const imagesToDelete = findImagesByIds(product.images, imageIds);
        
        if (imagesToDelete.length === 0) {
            return next(new AppError('No images found with provided IDs', 404));
        }

        // Check if we're deleting the main image
        const deletingMainImage = imagesToDelete.some(img => img.isMain);

        // Remove images from product
        product.images = removeImagesByIds(product.images, imageIds);

        // If we deleted the main image and there are still images left, set first as main
        if (deletingMainImage && product.images.length > 0) {
            product.images = setFirstAsMainIfNeeded(product.images);
        }

        // Sort remaining images by order
        product.images = sortImagesByOrder(product.images);

        // Update updatedBy field
        product.updatedBy = req.user.id;

        // Save product
        await product.save();

        // Clean up physical files from Cloudinary (async, don't wait)
        const imageUrls = imagesToDelete.map(img => img.url);
        cleanupImageFiles(imageUrls).catch(error => {
            console.error('Error cleaning up Cloudinary images:', error);
        });

        res.status(200).json({
            success: true,
            message: `Successfully deleted ${imagesToDelete.length} image(s) from Cloudinary`,
            data: product
        });
    }
);
