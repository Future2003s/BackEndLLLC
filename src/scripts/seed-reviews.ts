import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { Product } from "../models/Product";
import { Review } from "../models/Review";
import { User } from "../models/User";
import { logger } from "../utils/logger";
import { ReviewService } from "../services/reviewService";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const sampleTitles = [
  "Sản phẩm rất tốt",
  "Đáng tiền",
  "Chất lượng ổn",
  "Giao hàng nhanh",
  "Sẽ mua lại",
];

const sampleComments = [
  "Mình đã dùng 1 tuần và thấy ổn định.",
  "Giá hợp lý so với chất lượng.",
  "Đóng gói cẩn thận, sản phẩm đúng mô tả.",
  "Hỗ trợ khách hàng tốt.",
  "Màu sắc giống hình, rất ưng ý.",
];

async function ensureUsers(count: number): Promise<string[]> {
  const users = await User.find({ isActive: true }).limit(count).select("_id").lean();
  const userIds = users.map((u) => u._id.toString());

  if (userIds.length >= count) return userIds.slice(0, count);

  const toCreate = count - userIds.length;
  logger.info(`Creating ${toCreate} temporary users for seeding reviews...`);

  const createdIds: string[] = [];
  for (let i = 0; i < toCreate; i++) {
    const idx = Date.now() + i;
    const user = new User({
      firstName: "Review",
      lastName: `Tester${idx}`,
      email: `review.tester.${idx}@example.com`,
      password: "Password123!",
      role: "customer",
      isActive: true,
      isEmailVerified: true,
    } as any);
    await user.save();
    createdIds.push(user._id.toString());
  }

  return [...userIds, ...createdIds];
}

async function seedReviews(productId: string, count = 5) {
  try {
    logger.info("🌱 Seeding reviews...");
    await connectDatabase();

    const product = await Product.findById(productId).select("_id name");
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const userIds = await ensureUsers(count);

    let created = 0;
    for (let i = 0; i < userIds.length && created < count; i++) {
      const userId = userIds[i];

      // Skip if this user already has a review for the product
      const existing = await Review.findOne({ product: productId, user: userId }).select("_id").lean();
      if (existing) continue;

      const rating = randomInt(4, 5); // Favor positive reviews for demo
      const title = sampleTitles[randomInt(0, sampleTitles.length - 1)];
      const comment = sampleComments[randomInt(0, sampleComments.length - 1)];

      await Review.create({
        product: productId,
        user: userId,
        rating,
        title,
        comment,
        isVerifiedPurchase: Math.random() < 0.6,
        status: "approved",
      } as any);

      created++;
    }

    // Update product rating stats to reflect new reviews
    const stats = await ReviewService.getProductReviewStats(productId);
    await Product.findByIdAndUpdate(productId, {
      averageRating: stats.averageRating,
      reviewCount: stats.totalReviews,
    });

    logger.info(`✅ Reviews seeding completed. Created: ${created}`);
  } catch (err) {
    logger.error("❌ Seed reviews failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    logger.info("👋 Database disconnected");
  }
}

const productIdArg = process.argv[2] || process.env.PRODUCT_ID || "";
const countArg = parseInt(process.argv[3] || process.env.COUNT || "5", 10);

if (!productIdArg) {
  logger.error("Please provide a productId. Usage: ts-node src/scripts/seed-reviews.ts <productId> [count]");
  process.exit(1);
}

seedReviews(productIdArg, isNaN(countArg) ? 5 : countArg);

