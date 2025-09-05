import { IProduct } from "../models/Product";
import { deleteCloudinaryImage, getPublicIdFromUrl } from "../middleware/upload";

// Validate image limits for a product
export const validateImageLimits = (
    currentImages: any[],
    newImagesCount: number,
    maxImagesPerProduct: number = 10,
    maxImagesPerUpload: number = 5
): void => {
    if (newImagesCount > maxImagesPerUpload) {
        throw new Error(`Cannot upload more than ${maxImagesPerUpload} images at once`);
    }

    if (currentImages.length + newImagesCount > maxImagesPerProduct) {
        throw new Error(`Product cannot have more than ${maxImagesPerProduct} images total`);
    }
};

// Ensure only one main image exists
export const ensureOnlyOneMainImage = (images: any[], newMainImageId?: string): any[] => {
    return images.map((image) => {
        if (newMainImageId) {
            // Set specific image as main, others as false
            return {
                ...image,
                isMain: image._id?.toString() === newMainImageId
            };
        } else {
            // If no specific main image, keep existing main status
            return image;
        }
    });
};

// Set first image as main if no main image exists
export const setFirstAsMainIfNeeded = (images: any[]): any[] => {
    const hasMainImage = images.some((img) => img.isMain);

    if (!hasMainImage && images.length > 0) {
        return images.map((img, index) => ({
            ...img,
            isMain: index === 0
        }));
    }

    return images;
};

// Clean up orphaned image files from Cloudinary
export const cleanupImageFiles = async (imageUrls: string[]): Promise<void> => {
    const deletePromises = imageUrls.map(async (url) => {
        try {
            await deleteCloudinaryImage(url);
        } catch (error) {
            console.error(`Failed to delete image from Cloudinary: ${url}`, error);
        }
    });

    await Promise.allSettled(deletePromises);
};

// Generate image metadata for new uploads with Cloudinary data
export const generateImageMetadata = (
    uploadResults: Array<{
        url: string;
        public_id: string;
        width: number;
        height: number;
        format: string;
        bytes: number;
    }>,
    startOrder: number = 0
): any[] => {
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

// Find images by IDs in product images array
export const findImagesByIds = (images: any[], imageIds: string[]): any[] => {
    return images.filter((img) => imageIds.includes(img._id?.toString()));
};

// Remove images by IDs from product images array
export const removeImagesByIds = (images: any[], imageIds: string[]): any[] => {
    return images.filter((img) => !imageIds.includes(img._id?.toString()));
};

// Update image metadata by ID
export const updateImageMetadata = (
    images: any[],
    updates: Array<{
        imageId: string;
        alt?: string;
        order?: number;
        isMain?: boolean;
    }>
): any[] => {
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

// Sort images by order
export const sortImagesByOrder = (images: any[]): any[] => {
    return images.sort((a, b) => (a.order || 0) - (b.order || 0));
};

// Validate image update request
export const validateImageUpdateRequest = (updates: any[]): void => {
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
