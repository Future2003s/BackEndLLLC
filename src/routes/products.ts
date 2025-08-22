import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import {
    validateCreateProduct,
    validateUpdateProduct,
    validateProductId,
    noValidation
} from "../middleware/workingValidation";
import { searchRateLimit, generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import { staticDataCache } from "../middleware/compression";
import {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getFeaturedProducts,
    searchProducts,
    updateProductStock,
    getProductsByCategory,
    getProductsByBrand
} from "../controllers/productController";

const router = Router();

// Public routes with optimized caching and rate limiting
router.get("/search", searchRateLimit, searchProducts);
router.get("/featured", staticDataCache(300), getFeaturedProducts); // Cache for 5 minutes
router.get("/category/:categoryId", staticDataCache(600), getProductsByCategory); // Cache for 10 minutes
router.get("/brand/:brandId", staticDataCache(600), getProductsByBrand); // Cache for 10 minutes
router.get("/", generalRateLimit, getProducts);
router.get("/:id", staticDataCache(300), getProduct); // Cache individual products

// Protected routes (Admin/Seller only) with rate limiting
router.post("/", protect, authorize("admin", "seller"), adminRateLimit, validateCreateProduct, createProduct);
router.put(
    "/:id",
    protect,
    authorize("admin", "seller"),
    adminRateLimit,
    validateProductId,
    validateUpdateProduct,
    updateProduct
);
router.delete("/:id", protect, authorize("admin", "seller"), adminRateLimit, validateProductId, deleteProduct);
router.put(
    "/:id/stock",
    protect,
    authorize("admin", "seller"),
    adminRateLimit,
    validateProductId,
    noValidation,
    updateProductStock
);

export default router;
