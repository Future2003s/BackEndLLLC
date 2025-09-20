import { Router } from "express";
import {
    getNotifications,
    getNotificationSummary,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    generateSystemNotifications,
    getNotificationTypes
} from "../controllers/notificationController";
import { protect } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/v1/notifications
 * @desc    Get all notifications
 * @access  Private
 */
router.get("/", getNotifications);

/**
 * @route   GET /api/v1/notifications/summary
 * @desc    Get notification summary
 * @access  Private
 */
router.get("/summary", getNotificationSummary);

/**
 * @route   GET /api/v1/notifications/types
 * @desc    Get notification types
 * @access  Private
 */
router.get("/types", getNotificationTypes);

/**
 * @route   POST /api/v1/notifications
 * @desc    Create notification
 * @access  Private
 */
router.post("/", createNotification);

/**
 * @route   POST /api/v1/notifications/generate
 * @desc    Generate system notifications
 * @access  Private
 */
router.post("/generate", generateSystemNotifications);

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put("/:id/read", markAsRead);

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put("/read-all", markAllAsRead);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete("/:id", deleteNotification);

export default router;
