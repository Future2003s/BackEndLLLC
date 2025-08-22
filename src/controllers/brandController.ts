import { Request, Response, NextFunction } from 'express';
import { Brand } from '../models/Brand';
import { asyncHandler } from '../utils/asyncHandler';
import { ResponseHandler } from '../utils/response';
import { AppError } from '../utils/AppError';

// @desc    Get all brands
// @route   GET /api/v1/brands
// @access  Public
export const getBrands = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { includeInactive, search, page = 1, limit = 50 } = req.query;
    
    const filter: any = {};
    
    if (includeInactive !== 'true') {
        filter.isActive = true;
    }
    
    if (search) {
        filter.$text = { $search: search as string };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [brands, total] = await Promise.all([
        Brand.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit as string)),
        Brand.countDocuments(filter)
    ]);

    // Temporary: bypass fastJSON for brands
    res.status(200).json({
        success: true,
        message: 'Brands retrieved successfully',
        data: brands,
        pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / parseInt(limit as string))
        }
    });
});

// @desc    Get single brand
// @route   GET /api/v1/brands/:id
// @access  Public
export const getBrand = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
        return next(new AppError('Brand not found', 404));
    }

    ResponseHandler.success(res, brand, 'Brand retrieved successfully');
});

// @desc    Get brand by slug
// @route   GET /api/v1/brands/slug/:slug
// @access  Public
export const getBrandBySlug = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const brand = await Brand.findOne({ slug: req.params.slug });

    if (!brand) {
        return next(new AppError('Brand not found', 404));
    }

    ResponseHandler.success(res, brand, 'Brand retrieved successfully');
});

// @desc    Create brand
// @route   POST /api/v1/brands
// @access  Private (Admin)
export const createBrand = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, logo, website, isActive, seo } = req.body;

    const brand = await Brand.create({
        name,
        description,
        logo,
        website,
        isActive,
        seo
    });

    ResponseHandler.created(res, brand, 'Brand created successfully');
});

// @desc    Update brand
// @route   PUT /api/v1/brands/:id
// @access  Private (Admin)
export const updateBrand = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const brand = await Brand.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!brand) {
        return next(new AppError('Brand not found', 404));
    }

    ResponseHandler.success(res, brand, 'Brand updated successfully');
});

// @desc    Delete brand
// @route   DELETE /api/v1/brands/:id
// @access  Private (Admin)
export const deleteBrand = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
        return next(new AppError('Brand not found', 404));
    }

    // Check if brand has products
    if (brand.productCount > 0) {
        return next(new AppError('Cannot delete brand with products', 400));
    }

    await Brand.findByIdAndDelete(req.params.id);

    ResponseHandler.success(res, null, 'Brand deleted successfully');
});

// @desc    Get popular brands
// @route   GET /api/v1/brands/popular
// @access  Public
export const getPopularBrands = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { limit = 10 } = req.query;

    const brands = await Brand.find({ isActive: true })
        .sort({ productCount: -1 })
        .limit(parseInt(limit as string));

    ResponseHandler.success(res, brands, 'Popular brands retrieved successfully');
});
