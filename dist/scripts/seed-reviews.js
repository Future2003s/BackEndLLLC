"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = require("../config/database");
const Product_1 = require("../models/Product");
const Review_1 = require("../models/Review");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const reviewService_1 = require("../services/reviewService");
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
const sampleTitles = ["Sản phẩm rất tốt", "Đáng tiền", "Chất lượng ổn", "Giao hàng nhanh", "Sẽ mua lại"];
const sampleComments = [
    "Mình đã dùng 1 tuần và thấy ổn định.",
    "Giá hợp lý so với chất lượng.",
    "Đóng gói cẩn thận, sản phẩm đúng mô tả.",
    "Hỗ trợ khách hàng tốt.",
    "Màu sắc giống hình, rất ưng ý."
];
async function ensureUsers(count) {
    const users = await User_1.User.find({ isActive: true }).limit(count).select("_id").lean();
    const userIds = users.map((u) => u._id.toString());
    if (userIds.length >= count)
        return userIds.slice(0, count);
    const toCreate = count - userIds.length;
    logger_1.logger.info(`Creating ${toCreate} temporary users for seeding reviews...`);
    const createdIds = [];
    for (let i = 0; i < toCreate; i++) {
        const idx = Date.now() + i;
        const user = new User_1.User({
            firstName: "Review",
            lastName: `Tester${idx}`,
            email: `review.tester.${idx}@example.com`,
            password: "Password123!",
            role: "customer",
            isActive: true,
            isEmailVerified: true
        });
        await user.save();
        createdIds.push(user._id.toString());
    }
    return [...userIds, ...createdIds];
}
async function seedReviews(productId, count = 5) {
    try {
        logger_1.logger.info("🌱 Seeding reviews...");
        await (0, database_1.connectDatabase)();
        const product = await Product_1.Product.findById(productId).select("_id name");
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }
        const userIds = await ensureUsers(count);
        let created = 0;
        for (let i = 0; i < userIds.length && created < count; i++) {
            const userId = userIds[i];
            // Skip if this user already has a review for the product
            const existing = await Review_1.Review.findOne({ product: productId, user: userId }).select("_id").lean();
            if (existing)
                continue;
            const rating = randomInt(4, 5); // Favor positive reviews for demo
            const title = sampleTitles[randomInt(0, sampleTitles.length - 1)];
            const comment = sampleComments[randomInt(0, sampleComments.length - 1)];
            await Review_1.Review.create({
                product: productId,
                user: userId,
                rating,
                title,
                comment,
                isVerifiedPurchase: Math.random() < 0.6,
                status: "approved"
            });
            created++;
        }
        // Update product rating stats to reflect new reviews
        const stats = await reviewService_1.ReviewService.getProductReviewStats(productId);
        await Product_1.Product.findByIdAndUpdate(productId, {
            averageRating: stats.averageRating,
            reviewCount: stats.totalReviews
        });
        logger_1.logger.info(`✅ Reviews seeding completed. Created: ${created}`);
    }
    catch (err) {
        logger_1.logger.error("❌ Seed reviews failed:", err);
        process.exitCode = 1;
    }
    finally {
        await mongoose_1.default.disconnect();
        logger_1.logger.info("👋 Database disconnected");
    }
}
const productIdArg = process.argv[2] || process.env.PRODUCT_ID || "";
const countArg = parseInt(process.argv[3] || process.env.COUNT || "5", 10);
if (!productIdArg) {
    logger_1.logger.error("Please provide a productId. Usage: ts-node src/scripts/seed-reviews.ts <productId> [count]");
    process.exit(1);
}
seedReviews(productIdArg, isNaN(countArg) ? 5 : countArg);
