import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { Category } from "../models/Category";
import { Brand } from "../models/Brand";
import { cacheService } from "../services/cacheService";

/**
 * Inventory Management Controller for QuanLyHangTon
 * Provides comprehensive inventory management APIs
 */

/**
 * Get inventory overview with stock levels
 */
export const getInventoryOverview = asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = "inventory_overview";

    // Try cache first
    let overview = await cacheService.get("inventory", cacheKey);

    if (!overview) {
        const [totalProducts, lowStockProducts, outOfStockProducts, totalValue, categories, brands] = await Promise.all(
            [
                Product.countDocuments({ isVisible: true }),
                Product.countDocuments({
                    isVisible: true,
                    quantity: { $lte: 10 }
                }),
                Product.countDocuments({
                    isVisible: true,
                    quantity: { $lte: 0 }
                }),
                Product.aggregate([
                    { $match: { isVisible: true } },
                    {
                        $group: {
                            _id: null,
                            totalValue: { $sum: { $multiply: ["$price", "$quantity"] } }
                        }
                    }
                ]),
                Category.find({ isActive: true }).select("name"),
                Brand.find({ isActive: true }).select("name")
            ]
        );

        overview = {
            totalProducts,
            lowStockProducts,
            outOfStockProducts,
            totalValue: totalValue[0]?.totalValue || 0,
            categories: categories.map((c) => c.name),
            brands: brands.map((b) => b.name),
            lastUpdated: new Date()
        };

        // Cache for 5 minutes
        await cacheService.set("inventory", cacheKey, overview);
    }

    res.status(200).json(new ApiResponse(true, "Inventory overview retrieved successfully", overview));
});

/**
 * Get low stock products
 */
export const getLowStockProducts = asyncHandler(async (req: Request, res: Response) => {
    const { threshold = 10, page = 1, limit = 20 } = req.query;

    const products = await Product.find({
        isVisible: true,
        quantity: { $lte: parseInt(threshold as string) }
    })
        .populate("category", "name")
        .populate("brand", "name")
        .select("name sku price quantity minStock maxStock category brand updatedAt")
        .sort({ quantity: 1 })
        .limit(parseInt(limit as string) * 1)
        .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await Product.countDocuments({
        isVisible: true,
        quantity: { $lte: parseInt(threshold as string) }
    });

    res.status(200).json(
        new ApiResponse(true, "Low stock products retrieved successfully", {
            products,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string))
            }
        })
    );
});

/**
 * Update product stock
 */
export const updateProductStock = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { stock, operation = "set" } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json(new ApiResponse(true, "Product not found", null));
    }

    let newStock = product.quantity;
    switch (operation) {
        case "set":
            newStock = stock;
            break;
        case "add":
            newStock = product.quantity + stock;
            break;
        case "subtract":
            newStock = product.quantity - stock;
            break;
        default:
            return res.status(400).json(new ApiResponse(true, "Invalid operation", null));
    }

    if (newStock < 0) {
        return res.status(400).json(new ApiResponse(true, "Stock cannot be negative", null));
    }

    product.quantity = newStock;
    product.updatedAt = new Date();
    await product.save();

    // Clear cache
    await cacheService.delete("inventory", "inventory_overview");

    res.status(200).json(
        new ApiResponse(true, "Stock updated successfully", {
            productId: product._id,
            oldStock: product.quantity - (operation === "add" ? stock : operation === "subtract" ? -stock : 0),
            newStock: product.quantity,
            operation
        })
    );
});

/**
 * Get inventory analytics
 */
export const getInventoryAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { period = "30d" } = req.query;

    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [stockLevels, categoryDistribution, brandDistribution, stockHistory] = await Promise.all([
        // Stock levels distribution
        Product.aggregate([
            { $match: { isVisible: true } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $lte: ["$stock", 0] },
                            "out_of_stock",
                            { $cond: [{ $lte: ["$stock", 10] }, "low_stock", "in_stock"] }
                        ]
                    },
                    count: { $sum: 1 }
                }
            }
        ]),

        // Category distribution
        Product.aggregate([
            { $match: { isVisible: true } },
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
            {
                $group: {
                    _id: "$categoryInfo.name",
                    count: { $sum: 1 },
                    totalValue: { $sum: { $multiply: ["$price", "$stock"] } }
                }
            },
            { $sort: { count: -1 } }
        ]),

        // Brand distribution
        Product.aggregate([
            { $match: { isVisible: true } },
            {
                $lookup: {
                    from: "brands",
                    localField: "brand",
                    foreignField: "_id",
                    as: "brandInfo"
                }
            },
            { $unwind: "$brandInfo" },
            {
                $group: {
                    _id: "$brandInfo.name",
                    count: { $sum: 1 },
                    totalValue: { $sum: { $multiply: ["$price", "$stock"] } }
                }
            },
            { $sort: { count: -1 } }
        ]),

        // Stock history (simplified - in real app, you'd have a separate stock history collection)
        Product.aggregate([
            {
                $match: {
                    isVisible: true,
                    updatedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" }
                    },
                    avgStock: { $avg: "$stock" },
                    totalValue: { $sum: { $multiply: ["$price", "$stock"] } }
                }
            },
            { $sort: { _id: 1 } }
        ])
    ]);

    const analytics = {
        stockLevels: stockLevels.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        categoryDistribution,
        brandDistribution,
        stockHistory,
        period,
        generatedAt: new Date()
    };

    res.status(200).json(new ApiResponse(true, "Inventory analytics retrieved successfully", analytics));
});

/**
 * Get products with advanced filtering
 */
export const getInventoryProducts = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, search, category, brand, status, sortBy = "name", sortOrder = "asc" } = req.query;

    // Build filter object
    const filter: any = { isVisible: true };

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { sku: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }

    if (category) {
        const categoryDoc = await Category.findOne({ name: category });
        if (categoryDoc) {
            filter.category = categoryDoc._id;
        }
    }

    if (brand) {
        const brandDoc = await Brand.findOne({ name: brand });
        if (brandDoc) {
            filter.brand = brandDoc._id;
        }
    }

    if (status) {
        switch (status) {
            case "in_stock":
                filter.quantity = { $gt: 10 };
                break;
            case "low_stock":
                filter.quantity = { $gt: 0, $lte: 10 };
                break;
            case "out_of_stock":
                filter.quantity = { $lte: 0 };
                break;
        }
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    const products = await Product.find(filter)
        .populate("category", "name")
        .populate("brand", "name")
        .select("name sku price stock minStock maxStock category brand status updatedAt")
        .sort(sort)
        .limit(parseInt(limit as string) * 1)
        .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await Product.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(true, "Inventory products retrieved successfully", {
            products,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string))
            }
        })
    );
});

/**
 * Bulk update stock
 */
export const bulkUpdateStock = asyncHandler(async (req: Request, res: Response) => {
    const { updates } = req.body; // Array of { productId, stock, operation }

    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json(new ApiResponse(true, "Updates array is required", null));
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
        try {
            const { productId, stock, operation = "set" } = update;

            const product = await Product.findById(productId);
            if (!product) {
                errors.push({ productId, error: "Product not found" });
                continue;
            }

            let newStock = product.quantity;
            switch (operation) {
                case "set":
                    newStock = stock;
                    break;
                case "add":
                    newStock = product.quantity + stock;
                    break;
                case "subtract":
                    newStock = product.quantity - stock;
                    break;
                default:
                    errors.push({ productId, error: "Invalid operation" });
                    continue;
            }

            if (newStock < 0) {
                errors.push({ productId, error: "Stock cannot be negative" });
                continue;
            }

            product.quantity = newStock;
            product.updatedAt = new Date();
            await product.save();

            results.push({
                productId: product._id,
                oldStock: product.quantity - (operation === "add" ? stock : operation === "subtract" ? -stock : 0),
                newStock: product.quantity,
                operation
            });
        } catch (error) {
            errors.push({ productId: update.productId, error: (error as Error).message });
        }
    }

    // Clear cache
    await cacheService.delete("inventory", "inventory_overview");

    res.status(200).json(
        new ApiResponse(true, "Bulk stock update completed", {
            results,
            errors,
            summary: {
                total: updates.length,
                successful: results.length,
                failed: errors.length
            }
        })
    );
});
