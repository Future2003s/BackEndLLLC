import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, email, password, phone, role } = req.body;

    const result = await AuthService.register({
        firstName,
        lastName,
        email,
        password,
        phone,
        role
    } as any);

    ResponseHandler.authCreated(res, result, "User registered successfully.");
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, rememberMe, deviceInfo } = req.body;

    // Get request metadata
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";

    // Fallback to regular login for now, will enhance with session later
    const result = await AuthService.login({ email, password });

    ResponseHandler.authSuccess(res, result, "Login successful");
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.user?.sessionId;
    const userId = req.user?.id;

    if (sessionId) {
        // Terminate the session using SessionService
        const { SessionService } = await import("../services/sessionService");
        await SessionService.terminateSession(sessionId, "user");
    }

    // Legacy token blacklisting for backward compatibility
    const token = req.headers.authorization?.split(" ")[1];
    const { refreshToken } = req.body;

    if (token) {
        const { CacheWrapper } = await import("../utils/performance.js");
        const tokenBlacklist = new CacheWrapper("blacklist", 24 * 60 * 60);
        await tokenBlacklist.set(token, true);
    }

    if (refreshToken) {
        const { CacheWrapper } = await import("../utils/performance.js");
        const refreshBlacklist = new CacheWrapper("blacklist", 7 * 24 * 60 * 60);
        await refreshBlacklist.set(refreshToken, true);
    }

    ResponseHandler.success(res, null, "Logout successful");
});

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    const result = await AuthService.refreshToken(refreshToken);

    ResponseHandler.success(res, result, "Token refreshed successfully");
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    await AuthService.forgotPassword(email);

    ResponseHandler.success(res, null, "Password reset email sent");
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { password } = req.body;

    const result = await AuthService.resetPassword(token, password);

    ResponseHandler.success(res, result, "Password reset successful");
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
export const verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;

    await AuthService.verifyEmail(token);

    ResponseHandler.success(res, null, "Email verified successfully");
});

// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Public
export const resendVerification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    await AuthService.resendVerification(email);

    ResponseHandler.success(res, null, "Verification email sent");
});

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;

    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    ResponseHandler.success(res, null, "Password changed successfully");
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Use _id or id depending on what's available in req.user
    const userId = req.user._id || req.user.id;
    const user = await AuthService.getUserById(userId);

    ResponseHandler.success(res, user, "User profile retrieved successfully");
});
