"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const Product_1 = require("../models/Product");
const Category_1 = require("../models/Category");
const Brand_1 = require("../models/Brand");
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
const performance_1 = require("../utils/performance");
const redis_1 = require("../config/redis");
const pagination_1 = require("../utils/pagination");
class ProductService {
    static cache = new performance_1.CacheWrapper(redis_1.CACHE_PREFIXES.PRODUCTS, redis_1.CACHE_TTL.MEDIUM);
    static categoryCache = new performance_1.CacheWrapper(redis_1.CACHE_PREFIXES.CATEGORIES, redis_1.CACHE_TTL.LONG);
    static brandCache = new performance_1.CacheWrapper(redis_1.CACHE_PREFIXES.BRANDS, redis_1.CACHE_TTL.LONG);
    /**
     * Create a new product
     */
    static async createProduct(productData, userId) {
        try {
            // Validate category exists
            const category = await Category_1.Category.findById(productData.category);
            if (!category) {
                throw new AppError_1.AppError("Category not found", 404);
            }
            // Validate brand if provided
            if (productData.brand) {
                const brand = await Brand_1.Brand.findById(productData.brand);
                if (!brand) {
                    throw new AppError_1.AppError("Brand not found", 404);
                }
            }
            // Check if SKU already exists
            const existingProduct = await Product_1.Product.findOne({ sku: productData.sku });
            if (existingProduct) {
                throw new AppError_1.AppError("Product with this SKU already exists", 400);
            }
            // Create product
            const product = await Product_1.Product.create({
                ...productData,
                createdBy: userId
            });
            // Update category product count
            await Category_1.Category.findByIdAndUpdate(productData.category, { $inc: { productCount: 1 } });
            // Update brand product count if brand is provided
            if (productData.brand) {
                await Brand_1.Brand.findByIdAndUpdate(productData.brand, { $inc: { productCount: 1 } });
            }
            await product.populate(["category", "brand", "createdBy"]);
            logger_1.logger.info(`Product created: ${product.name} by user: ${userId}`);
            return product;
        }
        catch (error) {
            logger_1.logger.error("Create product error:", error);
            throw error;
        }
    }
    /**
     * Get products with filters and pagination
     */
    static async getProducts(filters = {}, query = {}) {
        try {
            const { page = 1, limit = 20, sort = "createdAt", order = "desc" } = query;
            // Generate cache key based on filters and query
            const cacheKey = this.generateCacheKey("products", filters, query);
            // Try to get from cache first
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug(`Cache hit for products: ${cacheKey}`);
                return cached;
            }
            // Build optimized filter query
            const filterQuery = this.buildProductFilterQuery(filters);
            // Create base query with necessary relations populated for admin UI
            const baseQuery = Product_1.Product.find(filterQuery).populate("category", "name").populate("brand", "name");
            // Use optimized pagination
            const result = await (0, pagination_1.paginateQuery)(baseQuery, {
                page,
                limit,
                sort,
                order,
                maxLimit: 100,
                cacheTTL: redis_1.CACHE_TTL.SHORT,
                cacheKey
            });
            // Transform the result to match expected format
            const response = {
                products: result.data,
                pagination: {
                    page: result.pagination.page,
                    limit: result.pagination.limit,
                    total: result.pagination.total,
                    pages: result.pagination.pages
                }
            };
            // Cache the result
            await this.cache.set(cacheKey, response, redis_1.CACHE_TTL.SHORT);
            return response;
        }
        catch (error) {
            logger_1.logger.error("Get products error:", error);
            throw error;
        }
    }
    /**
     * Get product by ID (with caching)
     */
    static async getProductById(productId) {
        try {
            // Try cache first
            const cacheKey = `product:${productId}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            const product = await Product_1.Product.findById(productId)
                .populate("category", "name slug description")
                .populate("brand", "name slug logo website")
                .populate("createdBy", "firstName lastName")
                .lean();
            if (!product) {
                throw new AppError_1.AppError("Product not found", 404);
            }
            // Cache the result
            await this.cache.set(cacheKey, product, redis_1.CACHE_TTL.MEDIUM);
            return product;
        }
        catch (error) {
            logger_1.logger.error("Get product by ID error:", error);
            throw error;
        }
    }
    /**
     * Get product by slug (with caching)
     */
    static async getProductBySlug(slug) {
        try {
            const cacheKey = `product:slug:${slug}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            const product = await Product_1.Product.findOne({ slug })
                .populate("category", "name slug description")
                .populate("brand", "name slug logo website")
                .populate("createdBy", "firstName lastName")
                .lean();
            if (!product) {
                throw new AppError_1.AppError("Product not found", 404);
            }
            await this.cache.set(cacheKey, product, redis_1.CACHE_TTL.MEDIUM);
            return product;
        }
        catch (error) {
            logger_1.logger.error("Get product by slug error:", error);
            throw error;
        }
    }
    /**
     * Update product (with cache invalidation)
     */
    static async updateProduct(productId, updateData, userId) {
        try {
            const product = await Product_1.Product.findById(productId);
            if (!product) {
                throw new AppError_1.AppError("Product not found", 404);
            }
            // Sanitize immutable and server-controlled fields from incoming update
            const { createdBy: _ignoreCreatedBy, updatedBy: _ignoreUpdatedBy, _id: _ignoreId, id: _ignoreId2, ...sanitizedUpdate } = updateData;
            // Validate category if provided
            if (sanitizedUpdate.category && sanitizedUpdate.category !== product.category.toString()) {
                const categoryExists = await Category_1.Category.findById(sanitizedUpdate.category);
                if (!categoryExists) {
                    throw new AppError_1.AppError("Category not found", 404);
                }
            }
            // Validate brand if provided
            if (sanitizedUpdate.brand && sanitizedUpdate.brand !== product.brand?.toString()) {
                const brandExists = await Brand_1.Brand.findById(sanitizedUpdate.brand);
                if (!brandExists) {
                    throw new AppError_1.AppError("Brand not found", 404);
                }
            }
            // Update product
            Object.assign(product, sanitizedUpdate);
            // Ensure createdBy exists for legacy documents
            if (!product.createdBy) {
                product.createdBy = userId;
            }
            product.updatedBy = userId;
            await product.save();
            // Invalidate caches so subsequent fetches don't serve stale data
            await this.invalidateProductCache(`product:${productId}`); // direct product cache
            await this.invalidateProductCache(); // all product list caches
            await pagination_1.optimizedPagination.clearCache(); // clear pagination caches
            await product.populate(["category", "brand", "createdBy"]);
            return product;
        }
        catch (error) {
            logger_1.logger.error("Update product error:", error);
            throw error;
        }
    }
    /**
     * Delete product (with cache invalidation)
     */
    static async deleteProduct(productId) {
        try {
            const product = await Product_1.Product.findById(productId);
            if (!product) {
                throw new AppError_1.AppError("Product not found", 404);
            }
            await Product_1.Product.findByIdAndDelete(productId);
            // Invalidate cache
            await this.invalidateProductCache(productId);
            logger_1.logger.info(`Product deleted: ${product.name}`);
        }
        catch (error) {
            logger_1.logger.error("Delete product error:", error);
            throw error;
        }
    }
    /**
     * Helper method to build optimized filter query
     */
    static buildProductFilterQuery(filters) {
        const filterQuery = {};
        if (filters.category) {
            filterQuery.category = filters.category;
        }
        if (filters.brand) {
            filterQuery.brand = filters.brand;
        }
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            filterQuery.price = {};
            if (filters.minPrice !== undefined) {
                filterQuery.price.$gte = filters.minPrice;
            }
            if (filters.maxPrice !== undefined) {
                filterQuery.price.$lte = filters.maxPrice;
            }
        }
        if (filters.tags && filters.tags.length > 0) {
            filterQuery.tags = { $in: filters.tags };
        }
        if (filters.status) {
            filterQuery.status = filters.status;
        }
        if (filters.isVisible !== undefined) {
            filterQuery.isVisible = filters.isVisible;
        }
        if (filters.isFeatured !== undefined) {
            filterQuery.isFeatured = filters.isFeatured;
        }
        if (filters.onSale !== undefined) {
            filterQuery.onSale = filters.onSale;
        }
        if (filters.inStock !== undefined) {
            if (filters.inStock) {
                filterQuery.$or = [{ trackQuantity: false }, { quantity: { $gt: 0 } }, { allowBackorder: true }];
            }
            else {
                filterQuery.trackQuantity = true;
                filterQuery.quantity = { $lte: 0 };
                filterQuery.allowBackorder = false;
            }
        }
        if (filters.search) {
            filterQuery.$text = { $search: filters.search };
        }
        return filterQuery;
    }
    /**
     * Generate cache key for products
     */
    static generateCacheKey(prefix, filters, query) {
        const keyParts = [prefix, JSON.stringify(filters), JSON.stringify(query)];
        const keyString = keyParts.join("|");
        return Buffer.from(keyString).toString("base64").slice(0, 50);
    }
    /**
     * Invalidate product cache
     */
    static async invalidateProductCache(pattern) {
        try {
            if (pattern) {
                await this.cache.invalidatePattern(pattern);
            }
            else {
                await this.cache.invalidatePattern("*");
            }
            logger_1.logger.info("Product cache invalidated");
        }
        catch (error) {
            logger_1.logger.error("Error invalidating product cache:", error);
        }
    }
    /**
     * Get featured products (with caching)
     */
    static async getFeaturedProducts(limit = 10) {
        try {
            const cacheKey = `featured:${limit}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            const products = await Product_1.Product.find({
                isFeatured: true,
                status: "active",
                isVisible: true
            })
                .populate("category", "name slug")
                .populate("brand", "name slug logo")
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
            await this.cache.set(cacheKey, products, redis_1.CACHE_TTL.MEDIUM);
            return products;
        }
        catch (error) {
            logger_1.logger.error("Get featured products error:", error);
            throw error;
        }
    }
    /**
     * Search products (with caching)
     */
    static async searchProducts(searchTerm, filters = {}, query = {}) {
        return this.getProducts({ ...filters, search: searchTerm }, query);
    }
    /**
     * Update product stock (with cache invalidation)
     */
    static async updateStock(productId, quantity) {
        try {
            const product = await Product_1.Product.findByIdAndUpdate(productId, { quantity }, { new: true, runValidators: true });
            if (!product) {
                throw new AppError_1.AppError("Product not found", 404);
            }
            // Invalidate cache
            await this.invalidateProductCache(productId);
            return product;
        }
        catch (error) {
            logger_1.logger.error("Update stock error:", error);
            throw error;
        }
    }
}
exports.ProductService = ProductService;
