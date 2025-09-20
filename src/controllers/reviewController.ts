import { Request, Response, NextFunction } from "express";
import { ReviewService } from "../services/reviewService";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { config } from "../config/config";

// @desc    Get all reviews
// @route   GET /api/v1/reviews
// @access  Public
export const getReviews = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, sort, order, product, user, rating, status, isVerifiedPurchase } = req.query;

    const filters = {
        product: product as string,
        user: user as string,
        rating: rating ? parseInt(rating as string) : undefined,
        status: status as "pending" | "approved" | "rejected",
        isVerifiedPurchase: isVerifiedPurchase ? isVerifiedPurchase === "true" : undefined
    };

    const query = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sort: sort as string,
        order: order as "asc" | "desc"
    };

    const result = await ReviewService.getReviews(filters, query);

    ResponseHandler.paginated(
        res,
        result.reviews,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Reviews retrieved successfully"
    );
});

// @desc    Get single review
// @route   GET /api/v1/reviews/:id
// @access  Public
export const getReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const review = await ReviewService.getReviewById(req.params.id);
    ResponseHandler.success(res, review, "Review retrieved successfully");
});

// @desc    Create review
// @route   POST /api/v1/reviews
// @access  Private
export const createReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Normalize payload to expected service format
    const payload = {
        product: (req.body.product as string) || (req.body.productId as string),
        rating: parseInt(req.body.rating, 10),
        title: req.body.title,
        comment: req.body.comment,
        images: req.body.images
    };

    const review = await ReviewService.createReview(payload, req.user.id);
    ResponseHandler.created(res, review, "Review created successfully");
});

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
export const updateReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const payload = {
        rating: req.body.rating !== undefined ? parseInt(req.body.rating, 10) : undefined,
        title: req.body.title,
        comment: req.body.comment,
        images: req.body.images
    };
    const review = await ReviewService.updateReview(req.params.id, payload, req.user.id);
    ResponseHandler.success(res, review, "Review updated successfully");
});

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
export const deleteReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await ReviewService.deleteReview(req.params.id, req.user.id);
    ResponseHandler.success(res, null, "Review deleted successfully");
});

// @desc    Get product reviews
// @route   GET /api/v1/reviews/product/:productId
// @access  Public
export const getProductReviews = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const { page, limit, sort, order } = req.query;

    const query = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sort: sort as string,
        order: order as "asc" | "desc"
    };

    const result = await ReviewService.getProductReviews(productId, query);

    res.status(200).json({
        success: true,
        message: "Product reviews retrieved successfully",
        data: result.reviews,
        pagination: result.pagination,
        stats: result.stats
    });
});

// @desc    Get product review stats
// @route   GET /api/v1/reviews/product/:productId/stats
// @access  Public
export const getProductReviewStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const stats = await ReviewService.getProductReviewStats(productId);
    ResponseHandler.success(res, stats, "Product review stats retrieved successfully");
});

// @desc    Moderate review
// @route   PUT /api/v1/reviews/:id/moderate
// @access  Private (Admin)
export const moderateReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { status, moderationNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
        return ResponseHandler.badRequest(res, "Status must be approved or rejected");
    }

    const review = await ReviewService.moderateReview(req.params.id, status, req.user.id, moderationNote);

    ResponseHandler.success(res, review, `Review ${status} successfully`);
});

// @desc    Mark review as helpful
// @route   PUT /api/v1/reviews/:id/helpful
// @access  Public
export const markReviewHelpful = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { isHelpful } = req.body;

    if (typeof isHelpful !== "boolean") {
        return ResponseHandler.badRequest(res, "isHelpful must be a boolean value");
    }

    const review = await ReviewService.markReviewHelpful(req.params.id, isHelpful, req.ip);

    const message = isHelpful ? "Review marked as helpful" : "Review marked as not helpful";
    ResponseHandler.success(res, review, message);
});

// @desc    Get user reviews
// @route   GET /api/v1/reviews/user/me
// @access  Private
export const getUserReviews = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, sort, order } = req.query;

    const filters = { user: req.user.id };
    const query = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sort: sort as string,
        order: order as "asc" | "desc"
    };

    const result = await ReviewService.getReviews(filters, query);

    ResponseHandler.paginated(
        res,
        result.reviews,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "User reviews retrieved successfully"
    );
});

// @desc    Get reviews by rating
// @route   GET /api/v1/reviews/rating/:rating
// @access  Public
export const getReviewsByRating = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { rating } = req.params;
    const { page, limit, sort, order, product } = req.query;

    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
        return ResponseHandler.badRequest(res, "Rating must be between 1 and 5");
    }

    const filters = {
        rating: ratingNum,
        product: product as string,
        status: "approved" as const
    };

    const query = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sort: sort as string,
        order: order as "asc" | "desc"
    };

    const result = await ReviewService.getReviews(filters, query);

    ResponseHandler.paginated(
        res,
        result.reviews,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        `Reviews with ${rating} stars retrieved successfully`
    );
});

// @desc    Review analytics & reporting
// @route   GET /api/v1/reviews/analytics
// @access  Private (Admin)
export const getReviewAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const data = await ReviewService.getReviewAnalytics({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined
    });
    ResponseHandler.success(res, data, "Review analytics retrieved successfully");
});
