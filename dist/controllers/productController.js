"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductsByBrand = exports.getProductsByCategory = exports.updateProductStock = exports.searchProducts = exports.getFeaturedProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const productService_1 = require("../services/productService");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const eventService_1 = require("../services/eventService");
const performance_1 = require("../utils/performance");
// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page, limit, sort, order, category, brand, minPrice, maxPrice, tags, status, isVisible, isFeatured, onSale, inStock, search } = req.query;
    const filters = {
        category: category,
        brand: brand,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        tags: tags ? tags.split(",") : undefined,
        status: status,
        isVisible: isVisible ? isVisible === "true" : undefined,
        isFeatured: isFeatured ? isFeatured === "true" : undefined,
        onSale: onSale ? onSale === "true" : undefined,
        inStock: inStock ? inStock === "true" : undefined,
        search: search
    };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await productService_1.ProductService.getProducts(filters, query);
    response_1.ResponseHandler.paginated(res, result.products, result.pagination.page, result.pagination.limit, result.pagination.total, "Products retrieved successfully");
});
// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const startTime = performance.now();
    const product = await productService_1.ProductService.getProductById(req.params.id);
    // Track product view event
    await eventService_1.eventService.emitProductEvent({
        productId: req.params.id,
        action: "view",
        userId: req.user?.id,
        sessionId: req.sessionId,
        metadata: {
            userAgent: req.get("User-Agent"),
            ip: req.ip,
            referrer: req.get("Referrer")
        }
    });
    // Track performance
    const responseTime = performance.now() - startTime;
    performance_1.performanceMonitor.recordRequest(responseTime);
    response_1.ResponseHandler.success(res, product, "Product retrieved successfully");
});
// @desc    Create product
// @route   POST /api/v1/products
// @access  Private (Admin/Seller)
exports.createProduct = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const product = await productService_1.ProductService.createProduct(req.body, req.user.id);
    response_1.ResponseHandler.created(res, product, "Product created successfully");
});
// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Admin/Seller)
exports.updateProduct = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id || req.user?._id;
    const product = await productService_1.ProductService.updateProduct(req.params.id, req.body, userId ? String(userId) : undefined);
    response_1.ResponseHandler.success(res, product, "Product updated successfully");
});
// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin/Seller)
exports.deleteProduct = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    await productService_1.ProductService.deleteProduct(req.params.id);
    response_1.ResponseHandler.success(res, null, "Product deleted successfully");
});
// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
exports.getFeaturedProducts = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const products = await productService_1.ProductService.getFeaturedProducts(limit);
    response_1.ResponseHandler.success(res, products, "Featured products retrieved successfully");
});
// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Public
exports.searchProducts = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { q: searchTerm, ...otherQuery } = req.query;
    if (!searchTerm) {
        return response_1.ResponseHandler.badRequest(res, "Search term is required");
    }
    const filters = {
        category: otherQuery.category,
        brand: otherQuery.brand,
        minPrice: otherQuery.minPrice ? parseFloat(otherQuery.minPrice) : undefined,
        maxPrice: otherQuery.maxPrice ? parseFloat(otherQuery.maxPrice) : undefined,
        tags: otherQuery.tags ? otherQuery.tags.split(",") : undefined,
        status: otherQuery.status,
        isVisible: otherQuery.isVisible ? otherQuery.isVisible === "true" : undefined,
        isFeatured: otherQuery.isFeatured ? otherQuery.isFeatured === "true" : undefined,
        onSale: otherQuery.onSale ? otherQuery.onSale === "true" : undefined,
        inStock: otherQuery.inStock ? otherQuery.inStock === "true" : undefined
    };
    const query = {
        page: otherQuery.page ? parseInt(otherQuery.page) : undefined,
        limit: otherQuery.limit ? parseInt(otherQuery.limit) : undefined,
        sort: otherQuery.sort,
        order: otherQuery.order
    };
    const result = await productService_1.ProductService.searchProducts(searchTerm, filters, query);
    response_1.ResponseHandler.paginated(res, result.products, result.pagination.page, result.pagination.limit, result.pagination.total, `Search results for "${searchTerm}"`);
});
// @desc    Update product stock
// @route   PUT /api/v1/products/:id/stock
// @access  Private (Admin/Seller)
exports.updateProductStock = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { quantity } = req.body;
    if (quantity === undefined || quantity < 0) {
        return response_1.ResponseHandler.badRequest(res, "Valid quantity is required");
    }
    const product = await productService_1.ProductService.updateStock(req.params.id, quantity);
    response_1.ResponseHandler.success(res, product, "Product stock updated successfully");
});
// @desc    Get products by category
// @route   GET /api/v1/products/category/:categoryId
// @access  Public
exports.getProductsByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { categoryId } = req.params;
    const { page, limit, sort, order } = req.query;
    const filters = { category: categoryId };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await productService_1.ProductService.getProducts(filters, query);
    response_1.ResponseHandler.paginated(res, result.products, result.pagination.page, result.pagination.limit, result.pagination.total, "Products by category retrieved successfully");
});
// @desc    Get products by brand
// @route   GET /api/v1/products/brand/:brandId
// @access  Public
exports.getProductsByBrand = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { brandId } = req.params;
    const { page, limit, sort, order } = req.query;
    const filters = { brand: brandId };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await productService_1.ProductService.getProducts(filters, query);
    response_1.ResponseHandler.paginated(res, result.products, result.pagination.page, result.pagination.limit, result.pagination.total, "Products by brand retrieved successfully");
});
