"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const Review_1 = require("../models/Review");
const Product_1 = require("../models/Product");
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
const spamFilter_1 = require("../utils/spamFilter");
const redis_1 = require("../config/redis");
class ReviewService {
    /**
     * Create a new review
     */
    static async createReview(reviewData, userId) {
        try {
            // Check if product exists
            const product = await Product_1.Product.findById(reviewData.product);
            if (!product) {
                throw new AppError_1.AppError("Product not found", 404);
            }
            // Check if user already reviewed this product
            const existingReview = await Review_1.Review.findOne({
                product: reviewData.product,
                user: userId
            });
            if (existingReview) {
                throw new AppError_1.AppError("You have already reviewed this product", 400);
            }
            // TODO: Check if user purchased this product (for verified purchase)
            const isVerifiedPurchase = false; // Placeholder
            // Spam/profanity analysis
            const analysis = (0, spamFilter_1.analyzeContent)(reviewData.title || "", reviewData.comment || "");
            // Create review (auto-flag if suspicious)
            const review = await Review_1.Review.create({
                ...reviewData,
                user: userId,
                isVerifiedPurchase,
                title: analysis.sanitizedTitle,
                comment: analysis.sanitizedComment,
                status: analysis.isSuspicious ? "pending" : "approved",
                moderationNote: analysis.isSuspicious ? `Auto-flagged: ${analysis.reasons.join(", ")}` : undefined
            });
            await review.populate(["user", "product"]);
            // Update product rating statistics if approved immediately
            await this.updateProductRatingStats(reviewData.product);
            logger_1.logger.info(`Review created for product: ${reviewData.product} by user: ${userId}`);
            return review;
        }
        catch (error) {
            logger_1.logger.error("Create review error:", error);
            throw error;
        }
    }
    /**
     * Get reviews with filters and pagination
     */
    static async getReviews(filters = {}, query = {}) {
        try {
            const { page = 1, limit = 20, sort = "createdAt", order = "desc" } = query;
            // Build filter query
            const filterQuery = {};
            if (filters.product) {
                filterQuery.product = filters.product;
            }
            if (filters.user) {
                filterQuery.user = filters.user;
            }
            if (filters.rating) {
                filterQuery.rating = filters.rating;
            }
            if (filters.status) {
                filterQuery.status = filters.status;
            }
            if (filters.isVerifiedPurchase !== undefined) {
                filterQuery.isVerifiedPurchase = filters.isVerifiedPurchase;
            }
            // Build sort object
            const sortObj = {};
            sortObj[sort] = order === "asc" ? 1 : -1;
            // Execute query with pagination
            const skip = (page - 1) * limit;
            const [reviews, total] = await Promise.all([
                Review_1.Review.find(filterQuery)
                    .populate("user", "firstName lastName avatar")
                    .populate("product", "name images")
                    .sort(sortObj)
                    .skip(skip)
                    .limit(limit),
                Review_1.Review.countDocuments(filterQuery)
            ]);
            return {
                reviews,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            logger_1.logger.error("Get reviews error:", error);
            throw error;
        }
    }
    /**
     * Get review by ID
     */
    static async getReviewById(reviewId) {
        try {
            const review = await Review_1.Review.findById(reviewId)
                .populate("user", "firstName lastName avatar")
                .populate("product", "name images");
            if (!review) {
                throw new AppError_1.AppError("Review not found", 404);
            }
            return review;
        }
        catch (error) {
            logger_1.logger.error("Get review by ID error:", error);
            throw error;
        }
    }
    /**
     * Update review
     */
    static async updateReview(reviewId, updateData, userId) {
        try {
            const review = await Review_1.Review.findById(reviewId);
            if (!review) {
                throw new AppError_1.AppError("Review not found", 404);
            }
            // Check if user owns this review
            if (review.user.toString() !== userId) {
                throw new AppError_1.AppError("Not authorized to update this review", 403);
            }
            // If updating text fields, run content analysis again
            if (updateData.title !== undefined || updateData.comment !== undefined) {
                const analysis = (0, spamFilter_1.analyzeContent)(updateData.title || "", updateData.comment || "");
                updateData.title = analysis.sanitizedTitle;
                updateData.comment = analysis.sanitizedComment;
                if (analysis.isSuspicious) {
                    updateData.status = "pending"; // Re-queue for moderation
                    updateData.moderationNote = `Auto-flagged on update: ${analysis.reasons.join(", ")}`;
                }
            }
            // Update review
            const updatedReview = await Review_1.Review.findByIdAndUpdate(reviewId, updateData, {
                new: true,
                runValidators: true
            }).populate(["user", "product"]);
            // Update product rating statistics
            await this.updateProductRatingStats(review.product.toString());
            logger_1.logger.info(`Review updated: ${reviewId} by user: ${userId}`);
            return updatedReview;
        }
        catch (error) {
            logger_1.logger.error("Update review error:", error);
            throw error;
        }
    }
    /**
     * Delete review
     */
    static async deleteReview(reviewId, userId) {
        try {
            const review = await Review_1.Review.findById(reviewId);
            if (!review) {
                throw new AppError_1.AppError("Review not found", 404);
            }
            // Check if user owns this review
            if (review.user.toString() !== userId) {
                throw new AppError_1.AppError("Not authorized to delete this review", 403);
            }
            const productId = review.product.toString();
            await Review_1.Review.findByIdAndDelete(reviewId);
            // Update product rating statistics
            await this.updateProductRatingStats(productId);
            logger_1.logger.info(`Review deleted: ${reviewId} by user: ${userId}`);
        }
        catch (error) {
            logger_1.logger.error("Delete review error:", error);
            throw error;
        }
    }
    /**
     * Moderate review (Admin only)
     */
    static async moderateReview(reviewId, status, moderatorId, moderationNote) {
        try {
            const review = await Review_1.Review.findByIdAndUpdate(reviewId, {
                status,
                moderatedBy: moderatorId,
                moderatedAt: new Date(),
                moderationNote
            }, { new: true, runValidators: true }).populate(["user", "product", "moderatedBy"]);
            if (!review) {
                throw new AppError_1.AppError("Review not found", 404);
            }
            // Update product rating statistics
            await this.updateProductRatingStats(review.product.toString());
            logger_1.logger.info(`Review moderated: ${reviewId} status: ${status} by moderator: ${moderatorId}`);
            return review;
        }
        catch (error) {
            logger_1.logger.error("Moderate review error:", error);
            throw error;
        }
    }
    /**
     * Mark review as helpful/not helpful (limited to 1 vote per IP per 24h)
     */
    static async markReviewHelpful(reviewId, isHelpful, voterIp) {
        try {
            // Simple abuse prevention using Redis
            const ip = voterIp || "anonymous";
            const voteKey = `review_vote:${reviewId}:${ip}:${isHelpful ? "helpful" : "not"}`;
            const alreadyVoted = await redis_1.redisCache.exists(voteKey);
            if (alreadyVoted) {
                throw new AppError_1.AppError("You have already voted recently", 429);
            }
            const updateField = isHelpful ? "helpfulCount" : "notHelpfulCount";
            const review = await Review_1.Review.findByIdAndUpdate(reviewId, { $inc: { [updateField]: 1 } }, { new: true }).populate(["user", "product"]);
            if (!review) {
                throw new AppError_1.AppError("Review not found", 404);
            }
            // Set vote key with 24h TTL
            await redis_1.redisCache.set(voteKey, true, { ttl: 24 * 60 * 60 });
            return review;
        }
        catch (error) {
            logger_1.logger.error("Mark review helpful error:", error);
            throw error;
        }
    }
    /**
     * Get product reviews
     */
    static async getProductReviews(productId, query = {}) {
        try {
            const filters = { product: productId, status: "approved" };
            const result = await this.getReviews(filters, query);
            // Get rating statistics
            const stats = await this.getProductReviewStats(productId);
            return {
                ...result,
                stats
            };
        }
        catch (error) {
            logger_1.logger.error("Get product reviews error:", error);
            throw error;
        }
    }
    /**
     * Get product review statistics
     */
    static async getProductReviewStats(productId) {
        try {
            const pipeline = [
                { $match: { product: productId, status: "approved" } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        totalReviews: { $sum: 1 },
                        ratings: { $push: "$rating" }
                    }
                }
            ];
            const result = await Review_1.Review.aggregate(pipeline);
            if (!result.length) {
                return {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
            }
            const { averageRating, totalReviews, ratings } = result[0];
            // Calculate rating distribution
            const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            ratings.forEach((rating) => {
                if (rating >= 1 && rating <= 5) {
                    ratingDistribution[rating]++;
                }
            });
            return {
                averageRating: Math.round(averageRating * 10) / 10,
                totalReviews,
                ratingDistribution
            };
        }
        catch (error) {
            logger_1.logger.error("Get product review stats error:", error);
            throw error;
        }
    }
    /**
     * Review analytics & reporting
     */
    static async getReviewAnalytics(params) {
        const match = {};
        if (params.startDate || params.endDate) {
            match.createdAt = {};
            if (params.startDate)
                match.createdAt.$gte = new Date(params.startDate);
            if (params.endDate)
                match.createdAt.$lte = new Date(params.endDate);
        }
        const pipeline = [
            { $match: match },
            {
                $facet: {
                    byStatus: [
                        { $group: { _id: "$status", count: { $sum: 1 } } },
                        { $project: { _id: 0, status: "$_id", count: 1 } }
                    ],
                    dailyCounts: [
                        {
                            $group: {
                                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    topProductsByRating: [
                        { $match: { status: "approved" } },
                        {
                            $group: {
                                _id: "$product",
                                averageRating: { $avg: "$rating" },
                                totalReviews: { $sum: 1 }
                            }
                        },
                        { $match: { totalReviews: { $gte: 5 } } },
                        { $sort: { averageRating: -1, totalReviews: -1 } },
                        { $limit: 10 }
                    ],
                    overview: [
                        {
                            $group: {
                                _id: null,
                                averageRating: { $avg: "$rating" },
                                totalReviews: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ];
        const [result] = await Review_1.Review.aggregate(pipeline);
        return result;
    }
    /**
     * Update product rating statistics
     */
    static async updateProductRatingStats(productId) {
        try {
            const stats = await this.getProductReviewStats(productId);
            await Product_1.Product.findByIdAndUpdate(productId, {
                averageRating: stats.averageRating,
                reviewCount: stats.totalReviews
            });
        }
        catch (error) {
            logger_1.logger.error("Update product rating stats error:", error);
        }
    }
}
exports.ReviewService = ReviewService;
