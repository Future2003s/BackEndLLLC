import mongoose, { Document, Schema } from "mongoose";

export interface IUserSession extends Document {
    userId: mongoose.Types.ObjectId;
    sessionId: string;
    deviceInfo: {
        deviceName: string;
        deviceType: "desktop" | "mobile" | "tablet";
        browser: string;
        os: string;
        userAgent: string;
        platform: string;
    };
    networkInfo: {
        ipAddress: string;
        location: string;
        country?: string;
        city?: string;
        timezone?: string;
    };
    tokenInfo: {
        accessToken: string;
        refreshToken?: string;
        jti: string; // JWT ID for token invalidation
        tokenHash: string; // Hash of the token for quick lookup
    };
    loginTime: Date;
    lastActive: Date;
    expiresAt: Date;
    isActive: boolean;
    isCurrentSession?: boolean;
    terminatedAt?: Date;
    terminatedBy?: "user" | "admin" | "system" | "security";
    securityFlags: {
        isFirstLogin: boolean;
        isSuspicious: boolean;
        riskScore: number;
        loginAttempts: number;
    };
    metadata: {
        loginMethod: "password" | "oauth" | "2fa";
        rememberMe: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
}

const UserSessionSchema = new Schema<IUserSession>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        deviceInfo: {
            deviceName: { type: String, required: true },
            deviceType: {
                type: String,
                enum: ["desktop", "mobile", "tablet"],
                required: true
            },
            browser: { type: String, required: true },
            os: { type: String, required: true },
            userAgent: { type: String, required: true },
            platform: { type: String, required: true }
        },
        networkInfo: {
            ipAddress: { type: String, required: true, index: true },
            location: { type: String, required: true },
            country: { type: String },
            city: { type: String },
            timezone: { type: String }
        },
        tokenInfo: {
            accessToken: { type: String, required: true },
            refreshToken: { type: String },
            jti: { type: String, required: true, unique: true, index: true },
            tokenHash: { type: String, required: true, index: true }
        },
        loginTime: { type: Date, default: Date.now, index: true },
        lastActive: { type: Date, default: Date.now, index: true },
        expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
        isActive: { type: Boolean, default: true, index: true },
        isCurrentSession: { type: Boolean, default: false },
        terminatedAt: { type: Date },
        terminatedBy: {
            type: String,
            enum: ["user", "admin", "system", "security"]
        },
        securityFlags: {
            isFirstLogin: { type: Boolean, default: false },
            isSuspicious: { type: Boolean, default: false },
            riskScore: { type: Number, default: 0, min: 0, max: 100 },
            loginAttempts: { type: Number, default: 1 }
        },
        metadata: {
            loginMethod: {
                type: String,
                enum: ["password", "oauth", "2fa"],
                default: "password"
            },
            rememberMe: { type: Boolean, default: false },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true,
        collection: "user_sessions"
    }
);

// Indexes for performance
UserSessionSchema.index({ userId: 1, isActive: 1 });
UserSessionSchema.index({ sessionId: 1, isActive: 1 });
UserSessionSchema.index({ "tokenInfo.jti": 1 });
UserSessionSchema.index({ "tokenInfo.tokenHash": 1 });
UserSessionSchema.index({ lastActive: -1 });
UserSessionSchema.index({ expiresAt: 1 });
UserSessionSchema.index({ "networkInfo.ipAddress": 1, userId: 1 });

// Static methods
UserSessionSchema.statics.findActiveSessionsByUserId = function (userId: string) {
    return this.find({
        userId,
        isActive: true,
        expiresAt: { $gte: new Date() }
    }).sort({ lastActive: -1 });
};

UserSessionSchema.statics.terminateSessionById = function (sessionId: string, terminatedBy: string = "user") {
    return this.findOneAndUpdate(
        { sessionId, isActive: true },
        {
            isActive: false,
            terminatedAt: new Date(),
            terminatedBy,
            "metadata.updatedAt": new Date()
        },
        { new: true }
    );
};

UserSessionSchema.statics.terminateAllUserSessions = function (
    userId: string,
    exceptSessionId?: string,
    terminatedBy: string = "user"
) {
    const query: any = { userId, isActive: true };
    if (exceptSessionId) {
        query.sessionId = { $ne: exceptSessionId };
    }

    return this.updateMany(query, {
        isActive: false,
        terminatedAt: new Date(),
        terminatedBy,
        "metadata.updatedAt": new Date()
    });
};

UserSessionSchema.statics.updateLastActive = function (sessionId: string) {
    return this.findOneAndUpdate(
        { sessionId, isActive: true },
        {
            lastActive: new Date(),
            "metadata.updatedAt": new Date()
        },
        { new: true }
    );
};

UserSessionSchema.statics.cleanupExpiredSessions = function () {
    return this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { lastActive: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 days old
        ]
    });
};

// Pre-save middleware
UserSessionSchema.pre("save", function (next) {
    this.metadata.updatedAt = new Date();
    next();
});

export const UserSession = mongoose.model<IUserSession>("UserSession", UserSessionSchema);
