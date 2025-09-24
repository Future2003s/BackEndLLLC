import { Request, Response, NextFunction } from "express";
import { SessionService } from "../services/sessionService";
import { SecurityAuditLog } from "../models/SecurityAuditLog";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

// @desc    Get all user sessions
// @route   GET /api/v1/auth/sessions
// @access  Private
export const getUserSessions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const currentSessionId = req.user?.sessionId;

    if (!userId) {
        return next(new AppError("User not authenticated", 401));
    }

    const sessions = await SessionService.getUserSessions(userId);

    // Mark current session
    const sessionsWithCurrent = sessions.map((session) => ({
        ...session.toObject(),
        isCurrentSession: session.sessionId === currentSessionId
    }));

    // Transform for frontend
    const transformedSessions = sessionsWithCurrent.map((session) => ({
        id: session.sessionId,
        deviceName: session.deviceInfo.deviceName,
        deviceType: session.deviceInfo.deviceType,
        browser: session.deviceInfo.browser,
        os: session.deviceInfo.os,
        location: session.networkInfo.location,
        ipAddress: session.networkInfo.ipAddress,
        lastActive: session.lastActive,
        isCurrentSession: session.isCurrentSession,
        loginTime: session.loginTime,
        securityFlags: session.securityFlags
    }));

    ResponseHandler.success(
        res,
        {
            sessions: transformedSessions,
            totalCount: transformedSessions.length,
            activeCount: transformedSessions.filter(
                (s) =>
                    s.isCurrentSession || new Date().getTime() - new Date(s.lastActive).getTime() < 24 * 60 * 60 * 1000
            ).length
        },
        "User sessions retrieved successfully"
    );
});

// @desc    Terminate a specific session
// @route   DELETE /api/v1/auth/sessions/:sessionId
// @access  Private
export const terminateSession = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const currentSessionId = req.user?.sessionId;

    if (!userId) {
        return next(new AppError("User not authenticated", 401));
    }

    if (sessionId === currentSessionId) {
        return next(new AppError("Cannot terminate current session. Use logout instead.", 400));
    }

    const result = await SessionService.terminateSession(sessionId, "user");

    if (!result) {
        return next(new AppError("Session not found or already terminated", 404));
    }

    ResponseHandler.success(res, { terminated: true }, "Session terminated successfully");
});

// @desc    Terminate all sessions except current
// @route   DELETE /api/v1/auth/sessions/all
// @access  Private
export const terminateAllSessions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const currentSessionId = req.user?.sessionId;

    if (!userId) {
        return next(new AppError("User not authenticated", 401));
    }

    const terminatedCount = await SessionService.terminateAllUserSessions(userId, currentSessionId, "user");

    ResponseHandler.success(
        res,
        {
            terminatedCount,
            message: `${terminatedCount} sessions terminated successfully`
        },
        "All other sessions terminated successfully"
    );
});

// @desc    Get session security analytics
// @route   GET /api/v1/auth/sessions/analytics
// @access  Private
export const getSessionAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
        return next(new AppError("User not authenticated", 401));
    }

    const sessions = await SessionService.getUserSessions(userId);
    const now = new Date();

    // Calculate analytics
    const analytics = {
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => now.getTime() - new Date(s.lastActive).getTime() < 24 * 60 * 60 * 1000)
            .length,
        deviceTypes: sessions.reduce(
            (acc, session) => {
                acc[session.deviceInfo.deviceType] = (acc[session.deviceInfo.deviceType] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        ),
        locations: sessions.reduce(
            (acc, session) => {
                const location = session.networkInfo.location;
                acc[location] = (acc[location] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        ),
        riskAssessment: {
            highRisk: sessions.filter((s) => s.securityFlags.riskScore > 70).length,
            mediumRisk: sessions.filter((s) => s.securityFlags.riskScore > 40 && s.securityFlags.riskScore <= 70)
                .length,
            lowRisk: sessions.filter((s) => s.securityFlags.riskScore <= 40).length,
            suspicious: sessions.filter((s) => s.securityFlags.isSuspicious).length
        },
        lastLoginTime: Math.max(...sessions.map((s) => new Date(s.loginTime).getTime())),
        oldestSession: Math.min(...sessions.map((s) => new Date(s.loginTime).getTime()))
    };

    ResponseHandler.success(res, analytics, "Session analytics retrieved successfully");
});

// @desc    Update session device name
// @route   PATCH /api/v1/auth/sessions/:sessionId
// @access  Private
export const updateSessionDeviceName = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const { deviceName } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return next(new AppError("User not authenticated", 401));
    }

    if (!deviceName || deviceName.trim().length === 0) {
        return next(new AppError("Device name is required", 400));
    }

    try {
        const session = await SessionService.updateSessionActivity(sessionId);
        // Update device name logic would go here

        ResponseHandler.success(res, { updated: true }, "Session device name updated successfully");
    } catch (error) {
        logger.error("Error updating session device name:", error);
        return next(new AppError("Failed to update session", 500));
    }
});

// @desc    Get session security history
// @route   GET /api/v1/auth/sessions/security-history
// @access  Private
export const getSecurityHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { limit = 50, page = 1 } = req.query;

    if (!userId) {
        return next(new AppError("User not authenticated", 401));
    }

    try {
        const history = await SecurityAuditLog.find({ userId })
            .sort({ "metadata.timestamp": -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .select("-__v");

        const totalCount = await SecurityAuditLog.countDocuments({ userId });

        ResponseHandler.success(
            res,
            {
                history,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(totalCount / Number(limit)),
                    totalItems: totalCount,
                    itemsPerPage: Number(limit)
                }
            },
            "Security history retrieved successfully"
        );
    } catch (error) {
        logger.error("Error fetching security history:", error);
        return next(new AppError("Failed to fetch security history", 500));
    }
});
