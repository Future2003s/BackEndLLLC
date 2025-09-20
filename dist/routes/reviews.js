"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const workingValidation_1 = require("../middleware/workingValidation");
const reviewController_1 = require("../controllers/reviewController");
const router = (0, express_1.Router)();
// Public routes
router.get("/", reviewController_1.getReviews);
router.get("/product/:productId/stats", reviewController_1.getProductReviewStats);
router.get("/product/:productId", reviewController_1.getProductReviews);
router.get("/rating/:rating", reviewController_1.getReviewsByRating);
router.put("/:id/helpful", reviewController_1.markReviewHelpful); // public helpfulness voting
router.get("/:id", reviewController_1.getReview);
// Protected routes
router.post("/", auth_1.protect, workingValidation_1.validateReview, reviewController_1.createReview);
router.put("/:id", auth_1.protect, workingValidation_1.validateUpdateReview, reviewController_1.updateReview);
router.delete("/:id", auth_1.protect, workingValidation_1.noValidation, reviewController_1.deleteReview);
router.get("/user/me", auth_1.protect, reviewController_1.getUserReviews);
router.put("/:id/moderate", auth_1.protect, (0, auth_1.authorize)("admin"), reviewController_1.moderateReview);
router.get("/analytics", auth_1.protect, (0, auth_1.authorize)("admin"), reviewController_1.getReviewAnalytics);
exports.default = router;
