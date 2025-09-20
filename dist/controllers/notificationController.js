"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationTypes = exports.generateSystemNotifications = exports.createNotification = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotificationSummary = exports.getNotifications = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const apiResponse_1 = require("../utils/apiResponse");
const Product_1 = require("../models/Product");
const Order_1 = require("../models/Order");
/**
 * Notification Controller for QuanLyHangTon
 * Handles system notifications and alerts
 */
// Mock notification data (in real app, you'd have a separate Notifications collection)
let notifications = [];
/**
 * Get all notifications
 */
exports.getNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, type, status = "unread", priority, sortBy = "createdAt", sortOrder = "desc" } = req.query;
    // Build filter
    let filteredNotifications = [...notifications];
    if (type) {
        filteredNotifications = filteredNotifications.filter((notif) => notif.type === type);
    }
    if (status) {
        filteredNotifications = filteredNotifications.filter((notif) => notif.status === status);
    }
    if (priority) {
        filteredNotifications = filteredNotifications.filter((notif) => notif.priority === priority);
    }
    // Sort
    filteredNotifications.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        if (sortOrder === "desc") {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
        else {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
    });
    // Paginate
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);
    res.status(200).json(new apiResponse_1.ApiResponse(true, "Notifications retrieved successfully", {
        notifications: paginatedNotifications,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredNotifications.length,
            pages: Math.ceil(filteredNotifications.length / parseInt(limit))
        }
    }));
});
/**
 * Get notification summary
 */
exports.getNotificationSummary = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const total = notifications.length;
    const unread = notifications.filter((n) => n.status === "unread").length;
    const read = notifications.filter((n) => n.status === "read").length;
    const byType = notifications.reduce((acc, notif) => {
        acc[notif.type] = (acc[notif.type] || 0) + 1;
        return acc;
    }, {});
    const byPriority = notifications.reduce((acc, notif) => {
        acc[notif.priority] = (acc[notif.priority] || 0) + 1;
        return acc;
    }, {});
    const recent = notifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    const summary = {
        total,
        unread,
        read,
        byType,
        byPriority,
        recent,
        generatedAt: new Date()
    };
    res.status(200).json(new apiResponse_1.ApiResponse(true, "Notification summary retrieved successfully", summary));
});
/**
 * Mark notification as read
 */
exports.markAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const notification = notifications.find((n) => n.id === id);
    if (!notification) {
        return res.status(404).json(new apiResponse_1.ApiResponse(true, "Notification not found", null));
    }
    notification.status = "read";
    notification.readAt = new Date();
    res.status(200).json(new apiResponse_1.ApiResponse(true, "Notification marked as read", notification));
});
/**
 * Mark all notifications as read
 */
exports.markAllAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const updatedCount = notifications
        .filter((n) => n.status === "unread")
        .map((n) => {
        n.status = "read";
        n.readAt = new Date();
        return n;
    }).length;
    res.status(200).json(new apiResponse_1.ApiResponse(true, "All notifications marked as read", {
        updatedCount,
        message: `${updatedCount} notifications marked as read`
    }));
});
/**
 * Delete notification
 */
exports.deleteNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const index = notifications.findIndex((n) => n.id === id);
    if (index === -1) {
        return res.status(404).json(new apiResponse_1.ApiResponse(true, "Notification not found", null));
    }
    notifications.splice(index, 1);
    res.status(200).json(new apiResponse_1.ApiResponse(true, "Notification deleted successfully", null));
});
/**
 * Create notification
 */
exports.createNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type, title, message, priority = "medium", data = {}, userId = null } = req.body;
    const notification = {
        id: `notif-${Date.now()}`,
        type,
        title,
        message,
        priority,
        data,
        userId,
        status: "unread",
        createdAt: new Date(),
        readAt: null
    };
    notifications.push(notification);
    res.status(201).json(new apiResponse_1.ApiResponse(true, "Notification created successfully", notification));
});
/**
 * Generate system notifications
 */
exports.generateSystemNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const generatedNotifications = [];
    // Check for low stock products
    const lowStockProducts = await Product_1.Product.find({
        isVisible: true,
        stock: { $lte: 10, $gt: 0 }
    }).limit(5);
    for (const product of lowStockProducts) {
        const existingNotification = notifications.find((n) => n.type === "low_stock" && n.data?.productId === product._id.toString());
        if (!existingNotification) {
            const notification = {
                id: `notif-${Date.now()}-${Math.random()}`,
                type: "low_stock",
                title: "Sản phẩm sắp hết hàng",
                message: `${product.name} chỉ còn ${product.quantity} sản phẩm`,
                priority: "high",
                data: {
                    productId: product._id.toString(),
                    productName: product.name,
                    currentStock: product.quantity
                },
                userId: null,
                status: "unread",
                createdAt: new Date(),
                readAt: null
            };
            notifications.push(notification);
            generatedNotifications.push(notification);
        }
    }
    // Check for out of stock products
    const outOfStockProducts = await Product_1.Product.find({
        isVisible: true,
        stock: { $lte: 0 }
    }).limit(5);
    for (const product of outOfStockProducts) {
        const existingNotification = notifications.find((n) => n.type === "out_of_stock" && n.data?.productId === product._id.toString());
        if (!existingNotification) {
            const notification = {
                id: `notif-${Date.now()}-${Math.random()}`,
                type: "out_of_stock",
                title: "Sản phẩm hết hàng",
                message: `${product.name} đã hết hàng`,
                priority: "urgent",
                data: {
                    productId: product._id.toString(),
                    productName: product.name,
                    currentStock: product.quantity
                },
                userId: null,
                status: "unread",
                createdAt: new Date(),
                readAt: null
            };
            notifications.push(notification);
            generatedNotifications.push(notification);
        }
    }
    // Check for recent orders (if any)
    const recentOrders = await Order_1.Order.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).limit(3);
    for (const order of recentOrders) {
        const existingNotification = notifications.find((n) => n.type === "new_order" && n.data?.orderId === order._id.toString());
        if (!existingNotification) {
            const notification = {
                id: `notif-${Date.now()}-${Math.random()}`,
                type: "new_order",
                title: "Đơn hàng mới",
                message: `Có đơn hàng mới #${order.orderNumber}`,
                priority: "medium",
                data: {
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                    totalAmount: order.total
                },
                userId: null,
                status: "unread",
                createdAt: new Date(),
                readAt: null
            };
            notifications.push(notification);
            generatedNotifications.push(notification);
        }
    }
    res.status(200).json(new apiResponse_1.ApiResponse(true, "System notifications generated successfully", {
        generated: generatedNotifications.length,
        notifications: generatedNotifications
    }));
});
/**
 * Get notification types
 */
exports.getNotificationTypes = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const types = [
        {
            id: "low_stock",
            name: "Sắp hết hàng",
            description: "Thông báo khi sản phẩm sắp hết hàng",
            icon: "⚠️",
            color: "orange"
        },
        {
            id: "out_of_stock",
            name: "Hết hàng",
            description: "Thông báo khi sản phẩm hết hàng",
            icon: "🚨",
            color: "red"
        },
        {
            id: "new_order",
            name: "Đơn hàng mới",
            description: "Thông báo khi có đơn hàng mới",
            icon: "📦",
            color: "blue"
        },
        {
            id: "system",
            name: "Hệ thống",
            description: "Thông báo hệ thống",
            icon: "⚙️",
            color: "gray"
        },
        {
            id: "maintenance",
            name: "Bảo trì",
            description: "Thông báo bảo trì hệ thống",
            icon: "🔧",
            color: "yellow"
        }
    ];
    res.status(200).json(new apiResponse_1.ApiResponse(true, "Notification types retrieved successfully", types));
});
