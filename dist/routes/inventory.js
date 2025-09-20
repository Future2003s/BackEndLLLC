"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventoryController_1 = require("../controllers/inventoryController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.protect);
/**
 * @route   GET /api/v1/inventory/overview
 * @desc    Get inventory overview
 * @access  Private
 */
router.get("/overview", inventoryController_1.getInventoryOverview);
/**
 * @route   GET /api/v1/inventory/low-stock
 * @desc    Get low stock products
 * @access  Private
 */
router.get("/low-stock", inventoryController_1.getLowStockProducts);
/**
 * @route   GET /api/v1/inventory/products
 * @desc    Get inventory products with filtering
 * @access  Private
 */
router.get("/products", inventoryController_1.getInventoryProducts);
/**
 * @route   GET /api/v1/inventory/analytics
 * @desc    Get inventory analytics
 * @access  Private
 */
router.get("/analytics", inventoryController_1.getInventoryAnalytics);
/**
 * @route   PUT /api/v1/inventory/stock/:productId
 * @desc    Update product stock
 * @access  Private
 */
router.put("/stock/:productId", inventoryController_1.updateProductStock);
/**
 * @route   PUT /api/v1/inventory/bulk-stock
 * @desc    Bulk update stock for multiple products
 * @access  Private
 */
router.put("/bulk-stock", inventoryController_1.bulkUpdateStock);
exports.default = router;
