"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const unifiedValidation_1 = require("../middleware/unifiedValidation");
const router = (0, express_1.Router)();
// All routes require admin authentication
router.use(auth_1.protect, (0, auth_1.authorize)("admin"));
// Dashboard stats
router.get("/dashboard", (req, res) => {
    res.json({ message: "Get dashboard stats - Coming soon" });
});
// User management
router.get("/users", unifiedValidation_1.validatePagination, (req, res) => {
    res.json({ message: "Get all users - Coming soon" });
});
router.put("/users/:id/status", unifiedValidation_1.validateUserId, unifiedValidation_1.validateAdminAction, (req, res) => {
    res.json({ message: "Update user status - Coming soon" });
});
// Product management
router.get("/products", unifiedValidation_1.validatePagination, (req, res) => {
    res.json({ message: "Get all products (Admin) - Coming soon" });
});
// Order management
router.get("/orders", unifiedValidation_1.validatePagination, (req, res) => {
    res.json({ message: "Get all orders (Admin) - Coming soon" });
});
// Analytics
router.get("/analytics/sales", (req, res) => {
    res.json({ message: "Get sales analytics - Coming soon" });
});
router.get("/analytics/users", (req, res) => {
    res.json({ message: "Get user analytics - Coming soon" });
});
exports.default = router;
