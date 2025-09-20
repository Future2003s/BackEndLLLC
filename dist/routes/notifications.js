"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.protect);
/**
 * @route   GET /api/v1/notifications
 * @desc    Get all notifications
 * @access  Private
 */
router.get("/", notificationController_1.getNotifications);
/**
 * @route   GET /api/v1/notifications/summary
 * @desc    Get notification summary
 * @access  Private
 */
router.get("/summary", notificationController_1.getNotificationSummary);
/**
 * @route   GET /api/v1/notifications/types
 * @desc    Get notification types
 * @access  Private
 */
router.get("/types", notificationController_1.getNotificationTypes);
/**
 * @route   POST /api/v1/notifications
 * @desc    Create notification
 * @access  Private
 */
router.post("/", notificationController_1.createNotification);
/**
 * @route   POST /api/v1/notifications/generate
 * @desc    Generate system notifications
 * @access  Private
 */
router.post("/generate", notificationController_1.generateSystemNotifications);
/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put("/:id/read", notificationController_1.markAsRead);
/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put("/read-all", notificationController_1.markAllAsRead);
/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete("/:id", notificationController_1.deleteNotification);
exports.default = router;
