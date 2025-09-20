import { Router } from "express";
import {
    getInventoryOverview,
    getLowStockProducts,
    updateProductStock,
    getInventoryAnalytics,
    getInventoryProducts,
    bulkUpdateStock
} from "../controllers/inventoryController";
import { protect } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/v1/inventory/overview
 * @desc    Get inventory overview
 * @access  Private
 */
router.get("/overview", getInventoryOverview);

/**
 * @route   GET /api/v1/inventory/low-stock
 * @desc    Get low stock products
 * @access  Private
 */
router.get("/low-stock", getLowStockProducts);

/**
 * @route   GET /api/v1/inventory/products
 * @desc    Get inventory products with filtering
 * @access  Private
 */
router.get("/products", getInventoryProducts);

/**
 * @route   GET /api/v1/inventory/analytics
 * @desc    Get inventory analytics
 * @access  Private
 */
router.get("/analytics", getInventoryAnalytics);

/**
 * @route   PUT /api/v1/inventory/stock/:productId
 * @desc    Update product stock
 * @access  Private
 */
router.put("/stock/:productId", updateProductStock);

/**
 * @route   PUT /api/v1/inventory/bulk-stock
 * @desc    Bulk update stock for multiple products
 * @access  Private
 */
router.put("/bulk-stock", bulkUpdateStock);

export default router;
