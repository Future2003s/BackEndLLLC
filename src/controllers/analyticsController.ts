import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { eventService } from "../services/eventService";
import { performanceMonitor } from "../utils/performance";
import { cacheService } from "../services/cacheService";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { Order } from "../models/Order";

/**
 * Analytics Controller for ShopDev
 * Provides comprehensive analytics and insights
 */

/**
 * Get dashboard analytics overview
 */
export const getDashboardAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = "dashboard_analytics";

    // Try cache first
    let analytics = await cacheService.get("analytics", cacheKey);

    if (!analytics) {
        // Calculate analytics
        const [
            totalProducts,
            totalUsers,
            totalOrders,
            productAnalytics,
            userAnalytics,
            orderAnalytics,
            performanceMetrics
        ] = await Promise.all([
            Product.countDocuments({ isVisible: true }),
            User.countDocuments({ isActive: true }),
            Order.countDocuments(),
            eventService.getAnalytics("product", "daily"),
            eventService.getAnalytics("user", "daily"),
            eventService.getAnalytics("order", "daily"),
            performanceMonitor.getMetrics()
        ]);

        analytics = {
            overview: {
                totalProducts,
                totalUsers,
                totalOrders,
                timestamp: new Date()
            },
            events: {
                products: productAnalytics,
                users: userAnalytics,
                orders: orderAnalytics
            },
            performance: performanceMetrics
        };

        // Cache for 5 minutes
        await cacheService.set("analytics", cacheKey, analytics);
    }

    res.json(new ApiResponse(true, "Dashboard analytics retrieved successfully", analytics));
});

/**
 * Get product analytics
 */
export const getProductAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { period = "daily" } = req.query;

    const [productStats, eventAnalytics, recentEvents] = await Promise.all([
        Product.findById(productId).select("name views purchases rating reviewCount"),
        eventService.getProductAnalytics(productId),
        eventService.getRecentEvents("anonymous", "product", 50)
    ]);

    if (!productStats) {
        return res.status(404).json(new ApiResponse(false, "Product not found"));
    }

    const analytics = {
        product: productStats,
        events: eventAnalytics,
        recentActivity: recentEvents.filter((e) => (e as any).productId === productId),
        trends: await eventService.getAnalytics("product", period as "daily" | "hourly")
    };

    res.json(new ApiResponse(true, "Product analytics retrieved successfully", analytics));
});

/**
 * Get user behavior analytics
 */
export const getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const [userStats, recentEvents, userTrends] = await Promise.all([
        User.findById(userId).select("firstName lastName email createdAt lastLogin orderCount totalSpent"),
        eventService.getRecentEvents(userId, undefined, Number(limit)),
        eventService.getAnalytics("user", "daily")
    ]);

    if (!userStats) {
        return res.status(404).json(new ApiResponse(false, "User not found"));
    }

    const analytics = {
        user: userStats,
        recentActivity: recentEvents,
        trends: userTrends,
        summary: {
            totalEvents: recentEvents.length,
            productViews: recentEvents.filter((e) => e.type === "product" && (e as any).action === "view").length,
            cartActions: recentEvents.filter(
                (e) => e.type === "product" && ["add_to_cart", "remove_from_cart"].includes((e as any).action)
            ).length,
            purchases: recentEvents.filter((e) => e.type === "product" && (e as any).action === "purchase").length
        }
    };

    res.json(new ApiResponse(true, "User analytics retrieved successfully", analytics));
});

/**
 * Get real-time analytics
 */
export const getRealTimeAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { type = "all" } = req.query;

    const analytics = await Promise.all([
        eventService.getAnalytics("product", "hourly"),
        eventService.getAnalytics("user", "hourly"),
        eventService.getAnalytics("order", "hourly"),
        performanceMonitor.getMetrics()
    ]);

    const realTimeData = {
        hourlyEvents: {
            products: analytics[0],
            users: analytics[1],
            orders: analytics[2]
        },
        performance: analytics[3],
        timestamp: new Date()
    };

    res.json(new ApiResponse(true, "Real-time analytics retrieved successfully", realTimeData));
});

/**
 * Get performance analytics
 */
export const getPerformanceAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { timeframe = "24h" } = req.query;

    const metrics = performanceMonitor.getMetrics();
    const cacheStats = cacheService.getStats();

    const performanceData = {
        metrics,
        cache: {
            stats: Object.fromEntries(cacheStats),
            memory: cacheService.getMemoryStats()
        },
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        },
        timeframe,
        timestamp: new Date()
    };

    res.json(new ApiResponse(true, "Performance analytics retrieved successfully", performanceData));
});

/**
 * Get top products analytics
 */
export const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10, sortBy = "views" } = req.query;

    const sortOptions: Record<string, any> = {
        views: { views: -1 },
        purchases: { purchases: -1 },
        rating: { rating: -1 },
        revenue: { totalRevenue: -1 }
    };

    const products = await Product.find({ isVisible: true })
        .sort(sortOptions[sortBy as string] || sortOptions.views)
        .limit(Number(limit))
        .select("name price views purchases rating reviewCount totalRevenue images")
        .lean();

    // Get event analytics for each product
    const productsWithAnalytics = await Promise.all(
        products.map(async (product) => {
            const analytics = await eventService.getProductAnalytics(product._id.toString());
            return {
                ...product,
                analytics
            };
        })
    );

    res.json(
        new ApiResponse(true, "Top products retrieved successfully", {
            products: productsWithAnalytics,
            sortBy,
            limit: Number(limit)
        })
    );
});

/**
 * Get conversion funnel analytics
 */
export const getConversionFunnel = asyncHandler(async (req: Request, res: Response) => {
    const { period = "daily" } = req.query;

    // Get analytics for different stages of the funnel
    const [productViews, cartAdds, checkouts, purchases] = await Promise.all([
        eventService.getAnalytics("product", period as "daily" | "hourly"),
        // You would need to implement these specific event types
        eventService.getAnalytics("cart", period as "daily" | "hourly"),
        eventService.getAnalytics("checkout", period as "daily" | "hourly"),
        eventService.getAnalytics("order", period as "daily" | "hourly")
    ]);

    // Calculate conversion rates
    const totalViews = Object.values(productViews).reduce((sum, count) => sum + count, 0);
    const totalCartAdds = Object.values(cartAdds).reduce((sum, count) => sum + count, 0);
    const totalCheckouts = Object.values(checkouts).reduce((sum, count) => sum + count, 0);
    const totalPurchases = Object.values(purchases).reduce((sum, count) => sum + count, 0);

    const funnel = {
        stages: {
            views: totalViews,
            cartAdds: totalCartAdds,
            checkouts: totalCheckouts,
            purchases: totalPurchases
        },
        conversionRates: {
            viewToCart: totalViews > 0 ? ((totalCartAdds / totalViews) * 100).toFixed(2) : 0,
            cartToCheckout: totalCartAdds > 0 ? ((totalCheckouts / totalCartAdds) * 100).toFixed(2) : 0,
            checkoutToPurchase: totalCheckouts > 0 ? ((totalPurchases / totalCheckouts) * 100).toFixed(2) : 0,
            overall: totalViews > 0 ? ((totalPurchases / totalViews) * 100).toFixed(2) : 0
        },
        period,
        timestamp: new Date()
    };

    res.json(new ApiResponse(true, "Conversion funnel analytics retrieved successfully", funnel));
});

/**
 * Get revenue analytics by month/year
 */
export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { period = "month", year = new Date().getFullYear(), startDate, endDate, groupBy = "month" } = req.query;

    let matchStage: any = {
        status: { $in: ["delivered", "processing", "shipped"] }, // Only count paid orders
        "payment.status": "completed"
    };

    // Date filtering
    if (startDate && endDate) {
        matchStage.createdAt = {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
        };
    } else if (year) {
        matchStage.createdAt = {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`)
        };
    }

    // Aggregation pipeline for revenue by month
    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    ...(groupBy === "day" && { day: { $dayOfMonth: "$createdAt" } })
                },
                totalRevenue: { $sum: "$total" },
                totalOrders: { $sum: 1 },
                averageOrderValue: { $avg: "$total" },
                totalItems: { $sum: { $sum: "$items.quantity" } }
            }
        },
        {
            $sort: {
                "_id.year": 1,
                "_id.month": 1,
                ...(groupBy === "day" && { "_id.day": 1 })
            }
        }
    ];

    const revenueData = await Order.aggregate(pipeline);

    // Calculate totals
    const totals = {
        totalRevenue: revenueData.reduce((sum, item) => sum + item.totalRevenue, 0),
        totalOrders: revenueData.reduce((sum, item) => sum + item.totalOrders, 0),
        totalItems: revenueData.reduce((sum, item) => sum + item.totalItems, 0),
        averageOrderValue: 0
    };
    totals.averageOrderValue = totals.totalOrders > 0 ? totals.totalRevenue / totals.totalOrders : 0;

    // Format data for frontend
    const formattedData = revenueData.map((item) => ({
        period:
            groupBy === "day"
                ? `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`
                : `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
        year: item._id.year,
        month: item._id.month,
        ...(groupBy === "day" && { day: item._id.day }),
        revenue: Math.round(item.totalRevenue * 100) / 100,
        orders: item.totalOrders,
        averageOrderValue: Math.round(item.averageOrderValue * 100) / 100,
        items: item.totalItems
    }));

    const analytics = {
        period: groupBy,
        year: year,
        data: formattedData,
        summary: {
            totalRevenue: Math.round(totals.totalRevenue * 100) / 100,
            totalOrders: totals.totalOrders,
            totalItems: totals.totalItems,
            averageOrderValue: Math.round(totals.averageOrderValue * 100) / 100,
            periodsWithSales: formattedData.length
        },
        filters: {
            period,
            year,
            startDate,
            endDate,
            groupBy
        },
        generatedAt: new Date()
    };

    res.json(new ApiResponse(true, "Revenue analytics retrieved successfully", analytics));
});

/**
 * Get top selling products by revenue
 */
export const getTopSellingProducts = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10, startDate, endDate, period = "all" } = req.query;

    let matchStage: any = {
        status: { $in: ["delivered", "processing", "shipped"] },
        "payment.status": "completed"
    };

    if (startDate && endDate) {
        matchStage.createdAt = {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
        };
    }

    const pipeline = [
        { $match: matchStage },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                productName: { $first: "$items.name" },
                totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                totalQuantitySold: { $sum: "$items.quantity" },
                totalOrders: { $sum: 1 },
                averagePrice: { $avg: "$items.price" }
            }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: Number(limit) }
    ];

    const topProducts = await Order.aggregate(pipeline);

    const formattedProducts = topProducts.map((product) => ({
        productId: product._id,
        productName: product.productName,
        totalRevenue: Math.round(product.totalRevenue * 100) / 100,
        totalQuantitySold: product.totalQuantitySold,
        totalOrders: product.totalOrders,
        averagePrice: Math.round(product.averagePrice * 100) / 100
    }));

    res.json(
        new ApiResponse(true, "Top selling products retrieved successfully", {
            products: formattedProducts,
            period,
            filters: { startDate, endDate, limit },
            generatedAt: new Date()
        })
    );
});

/**
 * Export analytics data
 */
export const exportAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { type, format = "json", startDate, endDate } = req.query;

    // This is a simplified export - in production you'd want more sophisticated filtering
    const analytics = await Promise.all([
        eventService.getAnalytics("product", "daily"),
        eventService.getAnalytics("user", "daily"),
        eventService.getAnalytics("order", "daily"),
        performanceMonitor.getMetrics()
    ]);

    const exportData = {
        events: {
            products: analytics[0],
            users: analytics[1],
            orders: analytics[2]
        },
        performance: analytics[3],
        exportedAt: new Date(),
        filters: {
            type,
            startDate,
            endDate
        }
    };

    if (format === "csv") {
        // Convert to CSV format
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=analytics.csv");

        // Simple CSV conversion (you'd want a proper CSV library in production)
        const csv = Object.entries(exportData.events.products)
            .map(([date, count]) => `${date},${count}`)
            .join("\n");

        res.send(`Date,Count\n${csv}`);
    } else {
        res.json(new ApiResponse(true, "Analytics data exported successfully", exportData));
    }
});

/**
 * Clear analytics cache (admin only)
 */
export const clearAnalyticsCache = asyncHandler(async (req: Request, res: Response) => {
    await Promise.all([cacheService.invalidatePattern("analytics", "*"), eventService.clearAnalytics()]);

    res.json(new ApiResponse(true, "Analytics cache cleared successfully"));
});
