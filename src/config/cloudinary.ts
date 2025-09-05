import { v2 as cloudinary } from 'cloudinary';
import { config } from './config';

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'duw5dconp',
    api_key: process.env.CLOUDINARY_API_KEY || '942933336542189',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'eSq2FUrATreexQ_upzYyI63eB4U'
});

// Upload options for product images
export const productImageUploadOptions = {
    folder: 'shopdev/products',
    resource_type: 'image' as const,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' },
        { format: 'auto' }
    ]
};

// Upload image to Cloudinary
export const uploadImageToCloudinary = async (
    fileBuffer: Buffer,
    options: any = {}
): Promise<{
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}> => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            ...productImageUploadOptions,
            ...options
        };

        cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    reject(error);
                } else if (result) {
                    resolve({
                        public_id: result.public_id,
                        secure_url: result.secure_url,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                        bytes: result.bytes
                    });
                } else {
                    reject(new Error('Upload failed - no result returned'));
                }
            }
        ).end(fileBuffer);
    });
};

// Delete image from Cloudinary
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        if (result.result !== 'ok') {
            throw new Error(`Failed to delete image: ${result.result}`);
        }
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};

// Extract public_id from Cloudinary URL
export const extractPublicIdFromUrl = (url: string): string => {
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
    } catch (error) {
        console.error('Error extracting public_id from URL:', url, error);
        throw new Error('Failed to extract public_id from Cloudinary URL');
    }
};

// Generate optimized image URL with transformations
export const generateOptimizedImageUrl = (
    publicId: string,
    options: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string;
        format?: string;
    } = {}
): string => {
    const {
        width = 800,
        height = 800,
        crop = 'limit',
        quality = 'auto:good',
        format = 'auto'
    } = options;

    return cloudinary.url(publicId, {
        width,
        height,
        crop,
        quality,
        format,
        secure: true
    });
};

// Validate Cloudinary configuration
export const validateCloudinaryConfig = (): boolean => {
    const { cloud_name, api_key, api_secret } = cloudinary.config();
    
    if (!cloud_name || !api_key || !api_secret) {
        console.error('Cloudinary configuration is incomplete');
        return false;
    }
    
    return true;
};

export { cloudinary };
