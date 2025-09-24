import express from "express";
import {
    getUserSessions,
    terminateSession,
    terminateAllSessions,
    getSessionAnalytics,
    updateSessionDeviceName,
    getSecurityHistory
} from "../controllers/sessionController";
import { protect } from "../middleware/auth";
import { authRateLimit, generalRateLimit } from "../middleware/rateLimiting";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Apply rate limiting to sensitive operations
const strictRateLimit = authRateLimit; // Use existing authRateLimit for strict operations
const moderateRateLimit = generalRateLimit; // Use existing generalRateLimit for moderate operations

// Routes
router.route("/").get(moderateRateLimit, getUserSessions); // GET /api/v1/auth/sessions

router.route("/analytics").get(moderateRateLimit, getSessionAnalytics); // GET /api/v1/auth/sessions/analytics

router.route("/security-history").get(moderateRateLimit, getSecurityHistory); // GET /api/v1/auth/sessions/security-history

router.route("/all").delete(strictRateLimit, terminateAllSessions); // DELETE /api/v1/auth/sessions/all

router
    .route("/:sessionId")
    .delete(strictRateLimit, terminateSession) // DELETE /api/v1/auth/sessions/:sessionId
    .patch(moderateRateLimit, updateSessionDeviceName); // PATCH /api/v1/auth/sessions/:sessionId

export default router;
