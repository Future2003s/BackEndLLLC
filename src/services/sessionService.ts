import { UserSession, IUserSession } from "../models/UserSession";
import { SecurityAuditLog } from "../models/SecurityAuditLog";
import { logger } from "../utils/logger";
import { AppError } from "../utils/AppError";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import UAParser from "ua-parser-js";
import geoip from "geoip-lite";

export interface DeviceInfo {
    deviceName: string;
    deviceType: "desktop" | "mobile" | "tablet";
    browser: string;
    os: string;
    userAgent: string;
    platform: string;
}

export interface NetworkInfo {
    ipAddress: string;
    location: string;
    country?: string;
    city?: string;
    timezone?: string;
}

export interface SessionCreateData {
    userId: string;
    userAgent: string;
    ipAddress: string;
    rememberMe?: boolean;
    loginMethod?: "password" | "oauth" | "2fa";
}

export class SessionService {
    /**
     * Create a new user session
     */
    static async createSession(data: SessionCreateData): Promise<{
        sessionId: string;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        session: IUserSession;
    }> {
        try {
            const { userId, userAgent, ipAddress, rememberMe = false, loginMethod = "password" } = data;

            // Parse device info from user agent
            const deviceInfo = this.parseDeviceInfo(userAgent);

            // Get network/location info
            const networkInfo = this.parseNetworkInfo(ipAddress);

            // Generate unique session ID
            const sessionId = this.generateSessionId();

            // Generate JWT tokens
            const jti = crypto.randomUUID();
            const tokenExpiry = rememberMe ? "30d" : "24h";
            const refreshTokenExpiry = rememberMe ? "90d" : "7d";

            const accessToken = jwt.sign(
                {
                    userId,
                    sessionId,
                    jti,
                    type: "access"
                },
                config.jwt.secret,
                { expiresIn: tokenExpiry }
            );

            const refreshToken = jwt.sign(
                {
                    userId,
                    sessionId,
                    jti,
                    type: "refresh"
                },
                config.jwt.refreshSecret || config.jwt.secret,
                { expiresIn: refreshTokenExpiry }
            );

            // Calculate expiration date
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 1));

            // Create session record
            const session = new UserSession({
                userId,
                sessionId,
                deviceInfo,
                networkInfo,
                tokenInfo: {
                    accessToken: this.hashToken(accessToken),
                    refreshToken: this.hashToken(refreshToken),
                    jti,
                    tokenHash: this.hashToken(accessToken)
                },
                expiresAt,
                securityFlags: {
                    isFirstLogin: await this.isFirstLogin(userId),
                    isSuspicious: this.calculateSuspiciousLogin(deviceInfo, networkInfo, userId),
                    riskScore: await this.calculateRiskScore(userId, deviceInfo, networkInfo),
                    loginAttempts: 1
                },
                metadata: {
                    loginMethod,
                    rememberMe
                }
            });

            await session.save();

            // Log security event
            await SecurityAuditLog.logSecurityEvent({
                userId,
                sessionId,
                eventType: "login",
                eventDetails: {
                    action: "user_login",
                    description: `User logged in from ${deviceInfo.deviceName}`,
                    result: "success"
                },
                deviceInfo,
                networkInfo: {
                    ipAddress,
                    location: networkInfo.location,
                    country: networkInfo.country,
                    userAgent
                },
                securityContext: {
                    riskScore: session.securityFlags.riskScore,
                    isSuspicious: session.securityFlags.isSuspicious
                }
            });

            logger.info(`New session created for user ${userId}: ${sessionId}`);

            return {
                sessionId,
                accessToken,
                refreshToken,
                expiresAt,
                session
            };
        } catch (error) {
            logger.error("Error creating session:", error);
            throw new AppError("Failed to create session", 500);
        }
    }

    /**
     * Get all active sessions for a user
     */
    static async getUserSessions(userId: string): Promise<IUserSession[]> {
        try {
            const sessions = await UserSession.findActiveSessionsByUserId(userId);

            // Update session metadata with current status
            return sessions.map((session) => {
                const sessionObj = session.toObject();
                sessionObj.isCurrentSession = false; // Will be set by calling code if needed
                return sessionObj;
            });
        } catch (error) {
            logger.error("Error fetching user sessions:", error);
            throw new AppError("Failed to fetch sessions", 500);
        }
    }

    /**
     * Terminate a specific session
     */
    static async terminateSession(sessionId: string, terminatedBy: string = "user"): Promise<boolean> {
        try {
            const session = await UserSession.terminateSessionById(sessionId, terminatedBy);

            if (session) {
                // Log security event
                await SecurityAuditLog.logSecurityEvent({
                    userId: session.userId,
                    sessionId,
                    eventType: "session_terminate",
                    eventDetails: {
                        action: "session_terminated",
                        description: `Session terminated by ${terminatedBy}`,
                        result: "success"
                    },
                    networkInfo: {
                        ipAddress: session.networkInfo.ipAddress,
                        userAgent: session.deviceInfo.userAgent
                    },
                    securityContext: {
                        riskScore: 0,
                        isSuspicious: false
                    }
                });

                logger.info(`Session terminated: ${sessionId} by ${terminatedBy}`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error("Error terminating session:", error);
            throw new AppError("Failed to terminate session", 500);
        }
    }

    /**
     * Terminate all sessions for a user except current one
     */
    static async terminateAllUserSessions(
        userId: string,
        exceptSessionId?: string,
        terminatedBy: string = "user"
    ): Promise<number> {
        try {
            const result = await UserSession.terminateAllUserSessions(userId, exceptSessionId, terminatedBy);

            // Log security event
            await SecurityAuditLog.logSecurityEvent({
                userId,
                sessionId: exceptSessionId,
                eventType: "session_terminate",
                eventDetails: {
                    action: "bulk_session_termination",
                    description: `All sessions terminated by ${terminatedBy}, count: ${result.modifiedCount}`,
                    result: "success"
                },
                securityContext: {
                    riskScore: 0,
                    isSuspicious: false
                }
            });

            logger.info(`Terminated ${result.modifiedCount} sessions for user ${userId}`);
            return result.modifiedCount;
        } catch (error) {
            logger.error("Error terminating user sessions:", error);
            throw new AppError("Failed to terminate sessions", 500);
        }
    }

    /**
     * Update session last active time
     */
    static async updateSessionActivity(sessionId: string): Promise<void> {
        try {
            await UserSession.updateLastActive(sessionId);
        } catch (error) {
            logger.error("Error updating session activity:", error);
            // Don't throw error for activity updates to avoid breaking requests
        }
    }

    /**
     * Validate session and token
     */
    static async validateSession(sessionId: string, tokenHash: string): Promise<IUserSession | null> {
        try {
            const session = await UserSession.findOne({
                sessionId,
                "tokenInfo.tokenHash": tokenHash,
                isActive: true,
                expiresAt: { $gte: new Date() }
            });

            if (session) {
                // Update last active time
                await this.updateSessionActivity(sessionId);
                return session;
            }

            return null;
        } catch (error) {
            logger.error("Error validating session:", error);
            return null;
        }
    }

    /**
     * Clean up expired sessions
     */
    static async cleanupExpiredSessions(): Promise<number> {
        try {
            const result = await UserSession.cleanupExpiredSessions();
            logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
            return result.deletedCount;
        } catch (error) {
            logger.error("Error cleaning up sessions:", error);
            return 0;
        }
    }

    // Private helper methods
    private static generateSessionId(): string {
        return crypto.randomBytes(32).toString("hex");
    }

    private static hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    private static parseDeviceInfo(userAgent: string): DeviceInfo {
        const parser = new UAParser(userAgent);
        const result = parser.getResult();

        let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
        if (result.device.type === "mobile") deviceType = "mobile";
        else if (result.device.type === "tablet") deviceType = "tablet";

        return {
            deviceName: result.device.model || `${result.browser.name} on ${result.os.name}`,
            deviceType,
            browser: `${result.browser.name} ${result.browser.version}`,
            os: `${result.os.name} ${result.os.version}`,
            userAgent,
            platform: result.os.name || "Unknown"
        };
    }

    private static parseNetworkInfo(ipAddress: string): NetworkInfo {
        const geo = geoip.lookup(ipAddress);

        let location = "Unknown";
        if (geo) {
            location = `${geo.city || "Unknown"}, ${geo.country || "Unknown"}`;
        }

        return {
            ipAddress,
            location,
            country: geo?.country,
            city: geo?.city,
            timezone: geo?.timezone
        };
    }

    private static async isFirstLogin(userId: string): Promise<boolean> {
        const sessionCount = await UserSession.countDocuments({ userId });
        return sessionCount === 0;
    }

    private static calculateSuspiciousLogin(deviceInfo: DeviceInfo, networkInfo: NetworkInfo, userId: string): boolean {
        // Simple heuristics - can be enhanced with ML
        const suspiciousFactors = [];

        // Check for unusual location
        if (networkInfo.country && networkInfo.country !== "VN") {
            suspiciousFactors.push("foreign_location");
        }

        // Check for unusual device
        if (deviceInfo.deviceName.includes("bot") || deviceInfo.userAgent.includes("bot")) {
            suspiciousFactors.push("bot_detected");
        }

        return suspiciousFactors.length > 0;
    }

    private static async calculateRiskScore(
        userId: string,
        deviceInfo: DeviceInfo,
        networkInfo: NetworkInfo
    ): Promise<number> {
        let riskScore = 0;

        // Base risk factors
        if (networkInfo.country !== "VN") riskScore += 20;
        if (deviceInfo.userAgent.includes("bot")) riskScore += 50;

        // Check recent failed login attempts
        const recentFailures = await SecurityAuditLog.countDocuments({
            userId,
            eventType: "login",
            "eventDetails.result": "failure",
            "metadata.timestamp": { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        });

        riskScore += Math.min(recentFailures * 10, 30);

        return Math.min(riskScore, 100);
    }
}
