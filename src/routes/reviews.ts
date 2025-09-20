import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { validateReview, validateUpdateReview, noValidation } from "../middleware/workingValidation";
import {
    getReviews,
    getReview,
    createReview,
    updateReview,
    deleteReview,
    getUserReviews,
    getProductReviews,
    getProductReviewStats,
    moderateReview,
    markReviewHelpful,
    getReviewsByRating,
    getReviewAnalytics
} from "../controllers/reviewController";

const router = Router();

// Public routes
router.get("/", getReviews);
router.get("/product/:productId/stats", getProductReviewStats);
router.get("/product/:productId", getProductReviews);
router.get("/rating/:rating", getReviewsByRating);
router.put("/:id/helpful", markReviewHelpful); // public helpfulness voting
router.get("/:id", getReview);

// Protected routes
router.post("/", protect, validateReview, createReview);
router.put("/:id", protect, validateUpdateReview, updateReview);
router.delete("/:id", protect, noValidation, deleteReview);
router.get("/user/me", protect, getUserReviews);
router.put("/:id/moderate", protect, authorize("admin"), moderateReview);
router.get("/analytics", protect, authorize("admin"), getReviewAnalytics);

export default router;
