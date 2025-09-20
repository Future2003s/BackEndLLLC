"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateImageUpdateRequest = exports.sortImagesByOrder = exports.updateImageMetadata = exports.removeImagesByIds = exports.findImagesByIds = exports.generateImageMetadata = exports.cleanupImageFiles = exports.setFirstAsMainIfNeeded = exports.ensureOnlyOneMainImage = exports.validateImageLimits = void 0;
const upload_1 = require("../middleware/upload");
// Validate image limits for a product
const validateImageLimits = (currentImages, newImagesCount, maxImagesPerProduct = 10, maxImagesPerUpload = 5) => {
    if (newImagesCount > maxImagesPerUpload) {
        throw new Error(`Cannot upload more than ${maxImagesPerUpload} images at once`);
    }
    if (currentImages.length + newImagesCount > maxImagesPerProduct) {
        throw new Error(`Product cannot have more than ${maxImagesPerProduct} images total`);
    }
};
exports.validateImageLimits = validateImageLimits;
// Ensure only one main image exists
const ensureOnlyOneMainImage = (images, newMainImageId) => {
    return images.map((image) => {
        if (newMainImageId) {
            // Set specific image as main, others as false
            return {
                ...image,
                isMain: image._id?.toString() === newMainImageId
            };
        }
        else {
            // If no specific main image, keep existing main status
            return image;
        }
    });
};
exports.ensureOnlyOneMainImage = ensureOnlyOneMainImage;
// Set first image as main if no main image exists
const setFirstAsMainIfNeeded = (images) => {
    const hasMainImage = images.some((img) => img.isMain);
    if (!hasMainImage && images.length > 0) {
        return images.map((img, index) => ({
            ...img,
            isMain: index === 0
        }));
    }
    return images;
};
exports.setFirstAsMainIfNeeded = setFirstAsMainIfNeeded;
// Clean up orphaned image files from Cloudinary
const cleanupImageFiles = async (imageUrls) => {
    const deletePromises = imageUrls.map(async (url) => {
        try {
            await (0, upload_1.deleteCloudinaryImage)(url);
        }
        catch (error) {
            console.error(`Failed to delete image from Cloudinary: ${url}`, error);
        }
    });
    await Promise.allSettled(deletePromises);
};
exports.cleanupImageFiles = cleanupImageFiles;
// Generate image metadata for new uploads with Cloudinary data
const generateImageMetadata = (uploadResults, startOrder = 0) => {
    return uploadResults.map((result, index) => ({
        url: result.url,
        alt: `Product image ${startOrder + index + 1}`,
        isMain: false,
        order: startOrder + index,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
    }));
};
exports.generateImageMetadata = generateImageMetadata;
// Find images by IDs in product images array
const findImagesByIds = (images, imageIds) => {
    return images.filter((img) => imageIds.includes(img._id?.toString()));
};
exports.findImagesByIds = findImagesByIds;
// Remove images by IDs from product images array
const removeImagesByIds = (images, imageIds) => {
    return images.filter((img) => !imageIds.includes(img._id?.toString()));
};
exports.removeImagesByIds = removeImagesByIds;
// Update image metadata by ID
const updateImageMetadata = (images, updates) => {
    const updatedImages = [...images];
    updates.forEach((update) => {
        const imageIndex = updatedImages.findIndex((img) => img._id?.toString() === update.imageId);
        if (imageIndex !== -1) {
            // Update the image metadata
            if (update.alt !== undefined) {
                updatedImages[imageIndex].alt = update.alt;
            }
            if (update.order !== undefined) {
                updatedImages[imageIndex].order = update.order;
            }
            if (update.isMain !== undefined) {
                updatedImages[imageIndex].isMain = update.isMain;
                // If setting this image as main, unset all others
                if (update.isMain) {
                    updatedImages.forEach((img, idx) => {
                        if (idx !== imageIndex) {
                            img.isMain = false;
                        }
                    });
                }
            }
        }
    });
    return updatedImages;
};
exports.updateImageMetadata = updateImageMetadata;
// Sort images by order
const sortImagesByOrder = (images) => {
    return images.sort((a, b) => (a.order || 0) - (b.order || 0));
};
exports.sortImagesByOrder = sortImagesByOrder;
// Validate image update request
const validateImageUpdateRequest = (updates) => {
    if (!Array.isArray(updates)) {
        throw new Error("Updates must be an array");
    }
    updates.forEach((update, index) => {
        if (!update.imageId) {
            throw new Error(`Update at index ${index} must have imageId`);
        }
        if (update.order !== undefined && (typeof update.order !== "number" || update.order < 0)) {
            throw new Error(`Order must be a non-negative number at index ${index}`);
        }
        if (update.isMain !== undefined && typeof update.isMain !== "boolean") {
            throw new Error(`isMain must be a boolean at index ${index}`);
        }
    });
};
exports.validateImageUpdateRequest = validateImageUpdateRequest;
