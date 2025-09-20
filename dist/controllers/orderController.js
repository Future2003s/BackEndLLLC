"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentOrders = exports.updateOrderStatus = exports.getAllOrders = exports.getOrderTracking = exports.cancelOrder = exports.getOrder = exports.getUserOrders = exports.createOrder = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const Order_1 = require("../models/Order");
const Product_1 = require("../models/Product");
const Cart_1 = require("../models/Cart");
const AppError_1 = require("../utils/AppError");
const eventService_1 = require("../services/eventService");
// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
exports.createOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { items, customer, shippingAddress, billingAddress, paymentMethod, notes, couponCode, amount, description } = req.body;
    const userId = req.user?.id; // Optional for guest checkout
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
        return next(new AppError_1.AppError("Order items are required", 400));
    }
    // Use customer data if shippingAddress is not provided
    if (!shippingAddress && !customer) {
        return next(new AppError_1.AppError("Shipping address or customer information is required", 400));
    }
    if (!paymentMethod) {
        return next(new AppError_1.AppError("Payment method is required", 400));
    }
    // Validate and calculate order items
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
        // If item has productId, validate product exists
        if (item.productId) {
            const product = await Product_1.Product.findById(item.productId);
            if (!product) {
                return next(new AppError_1.AppError(`Product not found: ${item.productId}`, 404));
            }
            if (!product.isVisible || product.status !== "active") {
                return next(new AppError_1.AppError(`Product not available: ${product.name}`, 400));
            }
            if (product.quantity < item.quantity) {
                return next(new AppError_1.AppError(`Insufficient stock for product: ${product.name}`, 400));
            }
            const price = product.salePrice || product.price;
            const itemTotal = price * item.quantity;
            subtotal += itemTotal;
            orderItems.push({
                product: product._id,
                name: product.name,
                sku: product.sku,
                quantity: item.quantity,
                price: price,
                image: product.images?.[0]
            });
            // Update product stock
            await Product_1.Product.findByIdAndUpdate(item.productId, { $inc: { quantity: -item.quantity } }, { new: true });
        }
        else {
            // Use provided item data (for orders without product lookup)
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            orderItems.push({
                name: item.name,
                sku: item.sku || `CUSTOM-${Date.now()}`,
                quantity: item.quantity,
                price: item.price
            });
        }
    }
    // Calculate tax and shipping (can be customized based on business logic)
    const tax = subtotal * 0.1; // 10% tax
    const shipping = subtotal > 500000 ? 0 : 30000; // Free shipping over 500k VND
    let discount = 0;
    // Apply coupon if provided (simplified logic)
    if (couponCode) {
        // In real app, validate coupon from database
        if (couponCode === "DISCOUNT10") {
            discount = subtotal * 0.1;
        }
    }
    // Use provided amount if available, otherwise calculate
    const calculatedTotal = subtotal + tax + shipping - discount;
    const total = amount || calculatedTotal;
    // Generate order number
    const orderCount = await Order_1.Order.countDocuments();
    const orderNumber = `ORD${String(orderCount + 1).padStart(6, "0")}`;
    // Prepare shipping address from customer data if not provided
    const finalShippingAddress = shippingAddress || {
        firstName: customer?.fullName?.split(" ")[0] || "Customer",
        lastName: customer?.fullName?.split(" ").slice(1).join(" ") || "",
        street: customer?.address || "",
        city: "Hải Phòng", // Default city
        state: "Hải Phòng", // Default state
        zipCode: "000000", // Default zip code
        country: "Việt Nam", // Default country
        phone: customer?.phone || ""
    };
    // Create order
    const order = await Order_1.Order.create({
        orderNumber,
        user: userId || null, // Allow null for guest orders
        items: orderItems,
        shippingAddress: finalShippingAddress,
        billingAddress: billingAddress || finalShippingAddress,
        payment: {
            method: paymentMethod === "cod" ? "cash_on_delivery" : paymentMethod,
            status: "pending"
        },
        subtotal,
        tax,
        taxRate: 0.1,
        shippingCost: shipping,
        discount,
        discountCode: couponCode,
        total,
        status: "pending",
        customerNotes: notes || customer?.note || description,
        currency: "VND"
    });
    // Product stock already updated in the loop above
    // Clear user's cart after successful order (only for logged-in users)
    if (userId) {
        try {
            await Cart_1.Cart.findOneAndDelete({ user: userId });
        }
        catch (error) {
            // Don't fail the order if cart clearing fails
            console.warn("Failed to clear cart:", error);
        }
    }
    // Populate order details for response
    const populatedOrder = await Order_1.Order.findById(order._id)
        .populate("user", "firstName lastName email")
        .populate("items.product", "name slug sku images");
    // Emit order created event
    await eventService_1.eventService.emitOrderEvent({
        orderId: order._id.toString(),
        userId: userId || "guest",
        action: "created",
        metadata: {
            orderNumber,
            total,
            itemCount: orderItems.length,
            isGuest: !userId
        }
    });
    response_1.ResponseHandler.created(res, populatedOrder, "Order created successfully");
});
// @desc    Get user orders
// @route   GET /api/v1/orders
// @access  Private
exports.getUserOrders = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page = 1, limit = 10, status, startDate, endDate, sort = "createdAt", order = "desc" } = req.query;
    const userId = req.user.id;
    // Build filter
    const filter = { user: userId };
    if (status) {
        filter.status = status;
    }
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            filter.createdAt.$lte = new Date(endDate);
        }
    }
    // Build sort
    const sortObj = {};
    sortObj[sort] = order === "asc" ? 1 : -1;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    // Ensure page is 1-based and skip is never negative
    const adjustedPage = Math.max(1, pageNum);
    const skip = (adjustedPage - 1) * limitNum;
    const orders = await Order_1.Order.find(filter)
        .populate("items.product", "name slug sku images")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);
    const total = await Order_1.Order.countDocuments(filter);
    response_1.ResponseHandler.paginated(res, orders, adjustedPage, limitNum, total, "Orders retrieved successfully");
});
// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    // Build filter - users can only see their own orders, admins can see all
    const filter = { _id: orderId };
    if (userRole !== "admin") {
        filter.user = userId;
    }
    const order = await Order_1.Order.findOne(filter)
        .populate("user", "firstName lastName email phone")
        .populate("items.product", "name slug sku images");
    if (!order) {
        return next(new AppError_1.AppError("Order not found", 404));
    }
    response_1.ResponseHandler.success(res, order, "Order retrieved successfully");
});
// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
exports.cancelOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;
    const order = await Order_1.Order.findOne({ _id: orderId, user: userId });
    if (!order) {
        return next(new AppError_1.AppError("Order not found", 404));
    }
    if (!["pending", "processing"].includes(order.status)) {
        return next(new AppError_1.AppError("Order cannot be cancelled", 400));
    }
    // Restore product stock
    for (const item of order.items) {
        await Product_1.Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } }, { new: true });
    }
    order.status = "cancelled";
    // Order model doesn't have cancelledAt field, use status history instead
    if (reason) {
        order.adminNotes = `Cancelled: ${reason}`;
    }
    await order.save();
    // Emit order cancelled event
    await eventService_1.eventService.emitOrderEvent({
        orderId: order._id.toString(),
        userId,
        action: "cancelled",
        metadata: {
            reason,
            originalStatus: "pending"
        }
    });
    response_1.ResponseHandler.success(res, order, "Order cancelled successfully");
});
// @desc    Get order tracking
// @route   GET /api/v1/orders/:id/tracking
// @access  Private
exports.getOrderTracking = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    // Build filter - users can only see their own orders, admins can see all
    const filter = { _id: orderId };
    if (userRole !== "admin") {
        filter.user = userId;
    }
    const order = await Order_1.Order.findOne(filter);
    if (!order) {
        return next(new AppError_1.AppError("Order not found", 404));
    }
    // Mock tracking history (in real app, this would come from shipping provider API)
    const trackingHistory = [
        {
            status: "pending",
            description: "Đơn hàng đã được tạo",
            timestamp: order.createdAt
        },
        {
            status: "processing",
            description: "Đơn hàng đang được xử lý",
            timestamp: order.createdAt
        }
    ];
    if (order.status === "shipped" || order.status === "delivered") {
        trackingHistory.push({
            status: "shipped",
            description: "Đơn hàng đã được giao cho đơn vị vận chuyển",
            timestamp: order.updatedAt
        });
    }
    if (order.status === "delivered") {
        trackingHistory.push({
            status: "delivered",
            description: "Đơn hàng đã được giao thành công",
            timestamp: order.deliveredAt || order.updatedAt
        });
    }
    const trackingData = {
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.status === "shipped"
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
            : undefined,
        trackingHistory
    };
    response_1.ResponseHandler.success(res, trackingData, "Order tracking retrieved successfully");
});
// @desc    Get all orders (Admin only)
// @route   GET /api/v1/orders/admin/all
// @access  Private (Admin)
exports.getAllOrders = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page = 1, limit = 10, status, startDate, endDate, sort = "createdAt", order = "desc" } = req.query;
    // Build filter
    const filter = {};
    if (status) {
        filter.status = status;
    }
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            filter.createdAt.$lte = new Date(endDate);
        }
    }
    // Build sort
    const sortObj = {};
    sortObj[sort] = order === "asc" ? 1 : -1;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    // Ensure page is 1-based and skip is never negative
    const adjustedPage = Math.max(1, pageNum);
    const skip = (adjustedPage - 1) * limitNum;
    const orders = await Order_1.Order.find(filter)
        .populate("user", "firstName lastName email phone")
        .populate("items.product", "name slug sku images")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);
    const total = await Order_1.Order.countDocuments(filter);
    response_1.ResponseHandler.paginated(res, orders, adjustedPage, limitNum, total, "Orders retrieved successfully");
});
// @desc    Update order status (Admin only)
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Admin)
exports.updateOrderStatus = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const orderId = req.params.id;
    const { status, notes } = req.body;
    const order = await Order_1.Order.findById(orderId);
    if (!order) {
        return next(new AppError_1.AppError("Order not found", 404));
    }
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
    if (!validStatuses.includes(status)) {
        return next(new AppError_1.AppError("Invalid order status", 400));
    }
    const oldStatus = order.status;
    order.status = status;
    if (status === "delivered") {
        order.deliveredAt = new Date();
    }
    if (notes) {
        order.adminNotes = notes;
    }
    await order.save();
    // Emit order status updated event
    await eventService_1.eventService.emitOrderEvent({
        orderId: order._id.toString(),
        userId: order.user?.toString() || "unknown",
        action: "updated",
        metadata: {
            oldStatus,
            newStatus: status,
            notes
        }
    });
    response_1.ResponseHandler.success(res, order, "Order status updated successfully");
});
// @desc    Get recent orders
// @route   GET /api/v1/orders/recent
// @access  Private
exports.getRecentOrders = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    const limitNum = Math.min(parseInt(limit) || 10, 50); // Max 50 orders
    // Build filter - users can only see their own orders, admins can see all
    const filter = {};
    if (userRole !== "admin") {
        filter.user = userId;
    }
    const orders = await Order_1.Order.find(filter)
        .populate("user", "firstName lastName email phone")
        .populate("items.product", "name slug sku images")
        .sort({ createdAt: -1 })
        .limit(limitNum);
    response_1.ResponseHandler.success(res, orders, "Recent orders retrieved successfully");
});
